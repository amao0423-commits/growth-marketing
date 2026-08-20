-- =============================================================================
-- アドプレス データベーススキーマ（PostgreSQL / Supabase）
-- /db/schema.sql
--
-- 実行順序に依存があるため、上から順に流すこと。
-- Supabase の場合、auth.users は既存。profiles がそれを 1:1 で拡張する。
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";     -- 全文検索・重複投稿の類似度判定用

-- =============================================================================
-- 列挙型
-- =============================================================================

create type article_status as enum (
  'draft',          -- 下書き
  'reviewing',      -- AI審査中
  'revision',       -- 差し戻し（投稿者の修正待ち）
  'human_review',   -- 編集部の確認待ち
  'scheduled',      -- 審査通過・公開ディレイ待ち（15分）
  'published',      -- 公開中
  'withdrawn',      -- 投稿者が取り下げ
  'removed'         -- 編集部が取り下げ（紹介リンク未提出・規約違反など）
);

create type article_source as enum (
  'user',           -- 一般ユーザーの無料投稿
  'sponsored',      -- 有料の広告記事（PR表記が必須）
  'editorial',      -- 編集部記事
  'legacy'          -- 旧 /blog/ から移行した編集部記事
);

create type review_verdict as enum (
  'auto_approve', 'revision_required', 'human_review', 'reject'
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

-- =============================================================================
-- profiles — 投稿者プロフィール
-- =============================================================================

create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null,                    -- 会社名・団体名・ニックネーム（記事に表示）
  contact_name   text,                             -- 担当者名（非公開）
  email          text not null,                    -- auth.users の複製。通知の宛先
  site_url       text,                             -- 公式サイト。リンク本数には数えない
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

  status            article_status not null default 'draft',
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

  published_at      timestamptz,
  scheduled_at      timestamptz,            -- ディレイ公開の予定時刻
  edit_deadline     timestamptz,            -- published_at + 1ヶ月
  report_ready_at   timestamptz,            -- published_at + 1ヶ月
  withdrawn_at      timestamptz,
  withdrawn_reason  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint sponsored_link_cap check (
    (is_sponsored and link_count <= 5) or (not is_sponsored and link_count <= 2)
  ),
  constraint image_cap check (image_count <= 5),
  constraint published_needs_time check (
    status <> 'published' or published_at is not null
  )
);

create index on articles (status, published_at desc);
create index on articles (category_slug, published_at desc) where status = 'published';
create index on articles (author_id, created_at desc);
create index on articles (is_sponsored, published_at desc) where status = 'published';
create index articles_body_trgm on articles using gin (body_text gin_trgm_ops);

-- 公開時に期限を自動設定する
create or replace function set_article_deadlines() returns trigger as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at    := coalesce(new.published_at, now());
    new.edit_deadline   := new.published_at + interval '1 month';
    new.report_ready_at := new.published_at + interval '1 month';
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

-- link_count を同期する
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
-- review_logs — AI審査の記録
-- =============================================================================

create table review_logs (
  id             bigserial primary key,
  article_id     bigint not null references articles(id) on delete cascade,
  attempt        int not null default 1,           -- 再審査で増える

  verdict        review_verdict not null,
  confidence     numeric(3,2),
  violations     jsonb not null default '[]'::jsonb,
  summary        text,

  model          text not null,                    -- 例 claude-sonnet-4-6
  prompt_version text not null,                    -- 判定基準を変えたら必ず上げる
  input_tokens   int,
  output_tokens  int,
  latency_ms     int,

  -- 人手による最終判断
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  override       review_verdict,
  override_note  text,

  created_at     timestamptz not null default now()
);

create index on review_logs (article_id, attempt desc);
create index on review_logs (verdict, created_at desc);
create index review_logs_violations on review_logs using gin (violations);

comment on column review_logs.prompt_version is
  '判定基準の版。誤検知の原因追跡に必須なので必ず記録する';

-- =============================================================================
-- referrals — 紹介リンクの提出
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
create or replace function create_referral_on_publish() returns trigger as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    insert into referrals (article_id, due_at, status)
    values (
      new.id,
      new.published_at + interval '14 days',
      case when new.source in ('user') and not new.is_sponsored
           then 'pending'::referral_status
           else 'waived'::referral_status end
    )
    on conflict (article_id) do nothing;
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_create_referral
  after update on articles
  for each row execute function create_referral_on_publish();

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

-- レポート表示用のビュー。公開1ヶ月後から参照する
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
-- reports — 掲載内容に関する通報
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
alter table ad_orders      enable row level security;
alter table article_stats  enable row level security;

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
-- 編集は公開後1ヶ月まで。公開後の状態変更はサーバー側（service role）で行う
create policy articles_update_own on articles
  for update using (
    author_id = auth.uid()
    and (status in ('draft','revision')
         or (status = 'published' and now() < edit_deadline))
  );
create policy articles_editor on articles
  for all using (is_editor());

-- article_links
create policy links_public_read on article_links
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.status = 'published'));
create policy links_own on article_links
  for all using (exists (
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

-- review_logs：投稿者には summary と violations のみアプリ側で返す
create policy review_own_read on review_logs
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.author_id = auth.uid()));
create policy review_editor on review_logs
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

-- =============================================================================
-- 定期ジョブ（pg_cron または外部スケジューラから実行）
-- =============================================================================

-- 1) ディレイ公開：scheduled を published にする（毎分）
create or replace function job_publish_scheduled() returns int as $$
  with x as (
    update articles set status = 'published', published_at = now()
    where status = 'scheduled' and scheduled_at <= now()
    returning 1
  ) select count(*)::int from x;
$$ language sql;

-- 2) 紹介リンクのリマインド：期限3日前（毎日）
create or replace function job_referral_reminders() returns setof referrals as $$
  select * from referrals
  where status = 'pending'
    and due_at between now() and now() + interval '3 days'
    and (cardinality(reminded_at) = 0
         or reminded_at[cardinality(reminded_at)] < now() - interval '3 days');
$$ language sql;

-- 3) 期限切れの取り下げ（毎日）
create or replace function job_remove_unreferred() returns int as $$
  with x as (
    update articles a
    set status = 'removed',
        withdrawn_at = now(),
        withdrawn_reason = '紹介リンクの提出期限を過ぎたため'
    from referrals r
    where r.article_id = a.id
      and r.status = 'pending'
      and r.due_at < now()
      and a.status = 'published'
    returning 1
  ) select count(*)::int from x;
$$ language sql;
