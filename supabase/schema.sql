-- =============================================================================
-- アドプレス データベーススキーマ（PostgreSQL / Supabase）
-- supabase/schema.sql
--
-- design-ref/schema.sql（当初のリファレンス案）をベースに、以下の方針を反映：
--   - ログインは Supabase Auth の OAuth（Google / LINE / X。Appleは対応しない）。
--     profiles が auth.users を 1:1 で拡張する。
--   - AI審査（ルールベース）は投稿をブロックしない。投稿は即時公開され、
--     review_logs は編集部の事後確認・不適切投稿の発見用ログとして書き込まれる
--     （article_status に reviewing/human_review 等の審査待ち状態は持たない）。
--   - 不適切な投稿は編集部の判断で削除できる。削除にあたり投稿者への
--     事前連絡は行わない（利用規約第5条・第9条に対応）。ただし削除の事実は
--     マイページの通知（notifications）には記録する。
--   - マイページ・お知らせ（notifications）・紹介リンクの14日ルール（referrals）
--     を実装する。
--
-- 実行順序に依存があるため、上から順に流すこと（Supabase Dashboard の
-- SQL Editor に貼り付けて実行するのが最も簡単）。
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";     -- 全文検索・重複投稿の類似度判定用

-- =============================================================================
-- 列挙型
-- =============================================================================

create type article_status as enum (
  'published',      -- 公開中（投稿と同時にこの状態になる）
  'withdrawn',      -- 投稿者からの申し出により取り下げ
  'removed'         -- 編集部が削除（規約違反・不適切な内容など。投稿者への事前連絡なし）
);

create type article_source as enum (
  'user',           -- 一般ユーザーの無料投稿
  'sponsored',      -- 有料の広告記事（PR表記が必須）
  'editorial',      -- 編集部記事
  'legacy'          -- 旧 /blog/ から移行した編集部記事
);

create type review_verdict as enum (
  'clean', 'flagged'   -- ルールベース審査の結果。公開はブロックしない、社内確認用
);

create type referral_status as enum (
  'pending',        -- 未提出
  'submitted',      -- 提出済み・確認待ち
  'verified',       -- 確認済み
  'rejected',       -- 確認できなかった（リンク切れ・該当記事なし）
  'waived'          -- 提出不要（広告記事・編集部記事）
);

create type ad_order_status as enum (
  'inquiry',        -- 申込受付
  'awaiting_draft', -- 原稿待ち
  'producing',      -- 制作中
  'published',      -- 掲載中
  'invoiced',       -- 請求済
  'paid',           -- 入金済
  'cancelled'
);

create type notification_type as enum (
  'published',        -- 投稿が公開された
  'flagged',           -- ルールベース審査で要確認となった（編集部確認中である旨を伝える程度）
  'removed',           -- 編集部により削除された
  'referral_reminder',-- 紹介リンク提出の期限が近い
  'referral_verified', -- 紹介リンクを確認した
  'report_ready'       -- 掲載レポートが見られるようになった
);

-- =============================================================================
-- profiles — 投稿者プロフィール（auth.users を1:1で拡張）
-- =============================================================================

create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null,                    -- 会社名・団体名・ニックネーム（記事に表示）
  contact_name   text,                             -- 担当者名（非公開）
  email          text not null,                    -- auth.users の複製。通知の宛先
  site_url       text,                             -- 公式サイト
  public_email   text,                             -- 記事末尾に載せる問い合わせ先
  public_tel     text,
  is_editorial   boolean not null default false,   -- 編集部アカウント
  is_banned      boolean not null default false,
  ban_reason     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on profiles (email);

comment on column profiles.display_name is '記事の発信元として表示される名前';

-- 新規サインアップ時に profiles を自動作成する
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- categories — カテゴリ
-- =============================================================================

create table categories (
  slug         text primary key,
  label        text not null,
  description  text,
  color_bg     text not null,       -- パステル背景（例 #FFE2CC）
  color_fg     text not null,       -- 同系の濃色（例 #94502A）
  sort_order   int  not null default 0,
  is_active    boolean not null default true
);

insert into categories (slug,label,color_bg,color_fg,sort_order,description) values
 ('kpop', 'K-POP',      '#FFD9E4','#8A3A55',1,'アーティストのリリース、来日公演、ファンイベントの告知'),
 ('korea','韓国情報',    '#FFE2CC','#94502A',2,'コスメ、フード、カルチャー。日本上陸のニュース'),
 ('ent',  'エンタメ',    '#E7DCFF','#5B429B',3,'映像、音楽、舞台、イベントの発表'),
 ('tech', 'IT・テック',  '#D6E7FF','#2B5A93',4,'新サービス、アップデート、資金調達'),
 ('sns',  'SNS・マーケ', '#D3F0E4','#1F6B52',5,'SNS運用、広告、SEO'),
 ('life', 'ライフ',      '#FFF0C4','#846412',6,'暮らし、健康、お金'),
 ('trip', '旅行',        '#CDECF2','#1F6A76',7,'国内外の観光、交通、宿泊'),
 ('biz',  'ビジネス',    '#E3E5EA','#474E5C',8,'業務システム、人材、経営');

-- =============================================================================
-- articles — 記事
-- =============================================================================

create table articles (
  id                bigint generated always as identity primary key,
  author_id         uuid not null references profiles(id) on delete restrict,
  category_slug     text not null references categories(slug),

  title             text not null,
  body_html         text not null,          -- サニタイズ済み。許可タグのみ
  body_text         text generated always as (
                      regexp_replace(body_html, '<[^>]+>', ' ', 'g')
                    ) stored,               -- 検索・重複判定用
  excerpt           text,

  status            article_status not null default 'published',
  source            article_source not null default 'user',
  is_sponsored      boolean not null default false,   -- true なら PR 表記が必須

  -- URL。legacy は /blog/{legacy_path}、それ以外は /news/{id}/
  legacy_path       text unique,
  slug              text,

  -- アイキャッチ。null なら自動生成SVGを使う
  cover_url         text,
  cover_is_generated boolean not null default true,

  link_count        int not null default 0,
  image_count       int not null default 0,

  -- 記事に関するお問い合わせ先（投稿時のスナップショット）
  contact_org       text not null,
  contact_email     text,
  contact_tel       text,
  contact_url       text,
  contact_public    boolean not null default false,

  published_at      timestamptz not null default now(),
  edit_deadline     timestamptz,            -- published_at + 1ヶ月
  report_ready_at   timestamptz,            -- published_at + 1ヶ月
  withdrawn_at      timestamptz,
  withdrawn_reason  text,
  removed_at        timestamptz,
  removed_reason    text,                   -- 編集部の運用メモ

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint sponsored_link_cap check (
    (is_sponsored and link_count <= 5) or (not is_sponsored and link_count <= 2)
  ),
  constraint image_cap check (image_count <= 5)
);

create index on articles (status, published_at desc);
create index on articles (category_slug, published_at desc) where status = 'published';
create index on articles (author_id, created_at desc);
create index on articles (is_sponsored, published_at desc) where status = 'published';
create index articles_body_trgm on articles using gin (body_text gin_trgm_ops);

create or replace function set_article_deadlines() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    new.edit_deadline   := coalesce(new.edit_deadline, new.published_at + interval '1 month');
    new.report_ready_at := coalesce(new.report_ready_at, new.published_at + interval '1 month');
  end if;
  new.updated_at := now();
  return new;
end $$ language plpgsql;

create trigger trg_article_deadlines
  before insert or update on articles
  for each row execute function set_article_deadlines();

-- =============================================================================
-- article_links — 記事内のリンク
-- =============================================================================

create table article_links (
  id          bigserial primary key,
  article_id  bigint not null references articles(id) on delete cascade,
  url         text not null,
  anchor_text text,
  placement   text not null check (placement in ('inline','outline')),  -- 本文中 / 記事末尾
  rel         text not null default 'nofollow',   -- 有料記事は 'sponsored'
  click_count int not null default 0,
  created_at  timestamptz not null default now()
);

create index on article_links (article_id);

create or replace function sync_link_count() returns trigger as $$
begin
  update articles set link_count = (
    select count(*) from article_links
    where article_id = coalesce(new.article_id, old.article_id)
  ) where id = coalesce(new.article_id, old.article_id);
  return null;
end $$ language plpgsql;

create trigger trg_sync_link_count
  after insert or delete on article_links
  for each statement execute function sync_link_count();

-- =============================================================================
-- review_logs — ルールベース審査の記録（非ブロッキング。事後確認用）
-- =============================================================================

create table review_logs (
  id             bigserial primary key,
  article_id     bigint not null references articles(id) on delete cascade,

  verdict        review_verdict not null,
  violations     jsonb not null default '[]'::jsonb,   -- 検出したNGワード・理由
  summary        text,

  rule_version   text not null,                    -- 判定ルールを変えたら必ず上げる

  -- 編集部が確認したかどうか（flagged のものだけ確認すればよい）
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  reviewed_note  text,
  action_taken   text,                              -- 'none' | 'removed' など

  created_at     timestamptz not null default now()
);

create index on review_logs (article_id, created_at desc);
create index on review_logs (verdict, reviewed_at) where verdict = 'flagged';
create index review_logs_violations on review_logs using gin (violations);

comment on table review_logs is
  '投稿は即時公開され、この審査結果によってブロックされることはない。flagged
   は編集部が事後に目視確認するためのフラグ。';

-- =============================================================================
-- referrals — 紹介リンクの提出（マイページから提出。掲載日+14日が期限）
-- =============================================================================

create table referrals (
  id            bigserial primary key,
  article_id    bigint not null references articles(id) on delete cascade,
  status        referral_status not null default 'pending',

  submitted_url text,
  channel       text check (channel in ('site','sns','newsletter','other')),
  submitted_at  timestamptz,

  verified_by   uuid references profiles(id),
  verified_at   timestamptz,
  reject_reason text,

  due_at        timestamptz not null,              -- published_at + 14日
  reminded_at   timestamptz[] default '{}',        -- リマインド送信日時の履歴

  created_at    timestamptz not null default now(),
  unique (article_id)
);

create index on referrals (status, due_at);

-- 公開と同時に referrals を作る。広告記事・編集部記事は waived
create or replace function create_referral_on_insert() returns trigger as $$
begin
  if new.status = 'published' then
    insert into referrals (article_id, due_at, status)
    values (
      new.id,
      new.published_at + interval '14 days',
      case when new.source = 'user' and not new.is_sponsored
           then 'pending'::referral_status
           else 'waived'::referral_status end
    )
    on conflict (article_id) do nothing;
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_create_referral
  after insert on articles
  for each row execute function create_referral_on_insert();

-- =============================================================================
-- notifications — マイページの「お知らせ」
-- =============================================================================

create table notifications (
  id           bigserial primary key,
  profile_id   uuid not null references profiles(id) on delete cascade,
  article_id   bigint references articles(id) on delete cascade,
  type         notification_type not null,
  message      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index on notifications (profile_id, created_at desc);
create index on notifications (profile_id, is_read) where is_read = false;

-- 公開時に通知を作る
create or replace function notify_on_publish() returns trigger as $$
begin
  if new.status = 'published' then
    insert into notifications (profile_id, article_id, type, message)
    values (new.author_id, new.id, 'published', '「' || new.title || '」を公開しました。');
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_notify_publish
  after insert on articles
  for each row execute function notify_on_publish();

-- 削除時に通知を作る（削除理由の詳細は伝えない。事前連絡はしない方針のため）
create or replace function notify_on_removed() returns trigger as $$
begin
  if new.status = 'removed' and (old.status is distinct from 'removed') then
    insert into notifications (profile_id, article_id, type, message)
    values (new.author_id, new.id, 'removed', '「' || new.title || '」を編集部の判断により取り下げました。');
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_notify_removed
  after update on articles
  for each row execute function notify_on_removed();

-- =============================================================================
-- ad_orders — 広告枠の申込（¥20,000・請求書払い）
-- =============================================================================

create table ad_orders (
  id             bigserial primary key,
  order_no       text not null unique
                 default 'AD-' || to_char(now(),'YYYYMM') || '-' ||
                         lpad((nextval('ad_orders_id_seq'))::text, 4, '0'),

  profile_id     uuid references profiles(id),
  article_id     bigint references articles(id),   -- 掲載後に紐づく

  status         ad_order_status not null default 'inquiry',

  -- 申込内容
  company_name   text not null,
  contact_name   text not null,
  contact_email  text not null,
  contact_tel    text,
  billing_name   text,                             -- 請求書の宛名
  billing_address text,
  wants_writing  boolean not null default false,   -- 記事作成代行（任意）
  desired_date   date,
  memo           text,

  -- 金額
  amount         int not null default 20000,       -- 税別
  tax_rate       numeric(4,3) not null default 0.10,
  amount_total   int generated always as
                 (round(amount * (1 + 0.10))::int) stored,

  -- 掲載枠
  top_slot_until      timestamptz,                 -- トップPR枠 7日間
  category_slot_until timestamptz,                 -- カテゴリ上部 14日間

  -- 請求
  invoice_no     text,
  invoiced_at    timestamptz,
  due_date       date,
  paid_at        timestamptz,
  payment_note   text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on ad_orders (status, created_at desc);
create index on ad_orders (profile_id);
create index on ad_orders (invoiced_at) where paid_at is null;

comment on table ad_orders is
  'オンライン決済は行わない。掲載後に請求書を発行し銀行振込で回収する';

-- =============================================================================
-- article_stats — PVレポート用の日次集計
-- =============================================================================

create table article_stats (
  article_id   bigint not null references articles(id) on delete cascade,
  stat_date    date not null,
  views        int not null default 0,
  unique_views int not null default 0,
  link_clicks  int not null default 0,
  avg_seconds  int not null default 0,
  referrer_top jsonb default '{}'::jsonb,
  primary key (article_id, stat_date)
);

create index on article_stats (stat_date desc);

create view article_report as
select
  a.id as article_id,
  a.title,
  a.published_at,
  a.report_ready_at,
  (now() >= a.report_ready_at) as is_ready,
  coalesce(sum(s.views), 0)        as total_views,
  coalesce(sum(s.unique_views), 0) as total_unique,
  coalesce(sum(s.link_clicks), 0)  as total_clicks,
  coalesce(round(avg(nullif(s.avg_seconds, 0))), 0) as avg_seconds
from articles a
left join article_stats s
  on s.article_id = a.id
 and s.stat_date between a.published_at::date and (a.published_at + interval '30 days')::date
where a.status = 'published'
group by a.id;

-- =============================================================================
-- content_reports — 掲載内容に関する通報
-- =============================================================================

create table content_reports (
  id           bigserial primary key,
  article_id   bigint not null references articles(id) on delete cascade,
  reporter_email text,
  reason       text not null check (reason in
                 ('false_info','copyright','privacy','offensive','spam','other')),
  detail       text,
  handled_by   uuid references profiles(id),
  handled_at   timestamptz,
  action_taken text,
  created_at   timestamptz not null default now()
);

create index on content_reports (article_id, created_at desc);
create index on content_reports (handled_at) where handled_at is null;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table profiles       enable row level security;
alter table articles       enable row level security;
alter table article_links  enable row level security;
alter table referrals      enable row level security;
alter table review_logs    enable row level security;
alter table notifications  enable row level security;
alter table ad_orders      enable row level security;
alter table article_stats  enable row level security;
alter table content_reports enable row level security;

-- 編集部かどうか
create or replace function is_editor() returns boolean as $$
  select coalesce((select is_editorial from profiles where id = auth.uid()), false);
$$ language sql stable security definer;

-- profiles
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_editor on profiles
  for all using (is_editor());

-- articles：公開記事は誰でも読める。自分の記事は全状態を読める
create policy articles_public_read on articles
  for select using (status = 'published');
create policy articles_own on articles
  for select using (author_id = auth.uid());
create policy articles_insert on articles
  for insert with check (author_id = auth.uid());
-- 公開後の状態変更（削除など）はサーバー側（service role）で行う。ここでは
-- 投稿者による更新は許可しない（投稿後は本文を編集できない仕様のため）。
create policy articles_editor on articles
  for all using (is_editor());

-- article_links
create policy links_public_read on article_links
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.status = 'published'));
create policy links_own on article_links
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.author_id = auth.uid()));

-- referrals：本人は自分の記事の分だけ。提出のみ可、確認は編集部
create policy referrals_own_read on referrals
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.author_id = auth.uid()));
create policy referrals_own_submit on referrals
  for update using (exists (
    select 1 from articles a where a.id = article_id and a.author_id = auth.uid()))
  with check (status in ('pending','submitted'));
create policy referrals_editor on referrals
  for all using (is_editor());

-- review_logs：投稿者は自分の記事の分だけ読める
create policy review_own_read on review_logs
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.author_id = auth.uid()));
create policy review_editor on review_logs
  for all using (is_editor());

-- notifications：本人のみ読み書き（既読フラグの更新のため update も許可）
create policy notifications_own on notifications
  for select using (profile_id = auth.uid());
create policy notifications_own_update on notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notifications_editor on notifications
  for all using (is_editor());

-- ad_orders：編集部のみ。申込フォームは service role で書き込む
create policy ad_orders_editor on ad_orders
  for all using (is_editor());

-- article_stats：本人はレポート公開日以降のみ
create policy stats_own on article_stats
  for select using (exists (
    select 1 from articles a
    where a.id = article_id and a.author_id = auth.uid()
      and now() >= a.report_ready_at));
create policy stats_editor on article_stats
  for all using (is_editor());

-- content_reports：編集部のみ（通報フォームは service role 経由）
create policy content_reports_editor on content_reports
  for all using (is_editor());

-- =============================================================================
-- 定期ジョブ（pg_cron または Vercel Cron から実行）
-- =============================================================================

-- 1) 紹介リンクのリマインド通知：期限3日前（毎日）
create or replace function job_referral_reminders() returns int as $$
  with due as (
    select r.*, a.author_id, a.title
    from referrals r
    join articles a on a.id = r.article_id
    where r.status = 'pending'
      and r.due_at between now() and now() + interval '3 days'
      and (cardinality(r.reminded_at) = 0
           or r.reminded_at[cardinality(r.reminded_at)] < now() - interval '3 days')
  ), ins as (
    insert into notifications (profile_id, article_id, type, message)
    select author_id, article_id, 'referral_reminder',
           '「' || title || '」の紹介リンク提出期限が近づいています。'
    from due
    returning 1
  ), upd as (
    update referrals set reminded_at = reminded_at || now()
    where id in (select id from due)
  )
  select count(*)::int from ins;
$$ language sql;

-- 2) 期限切れの取り下げ（毎日）。投稿者への事前連絡はせず、通知のみ記録する。
create or replace function job_remove_unreferred() returns int as $$
  with x as (
    update articles a
    set status = 'removed',
        removed_at = now(),
        removed_reason = '紹介リンクの提出期限を過ぎたため'
    from referrals r
    where r.article_id = a.id
      and r.status = 'pending'
      and r.due_at < now()
      and a.status = 'published'
    returning 1
  ) select count(*)::int from x;
$$ language sql;

-- 3) 掲載レポートが見られるようになったことの通知（毎日）
create or replace function job_report_ready_notify() returns int as $$
  with ready as (
    select a.id, a.author_id, a.title
    from articles a
    where a.status = 'published'
      and a.report_ready_at between now() - interval '1 day' and now()
      and not exists (
        select 1 from notifications n
        where n.article_id = a.id and n.type = 'report_ready'
      )
  ), ins as (
    insert into notifications (profile_id, article_id, type, message)
    select author_id, id, 'report_ready', '「' || title || '」の掲載レポートが見られるようになりました。'
    from ready
    returning 1
  )
  select count(*)::int from ins;
$$ language sql;
