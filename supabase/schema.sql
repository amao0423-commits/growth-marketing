-- =============================================================================
-- アドプレス データベーススキーマ（PostgreSQL / Supabase）
-- supabase/schema.sql
--
-- design-ref/schema.sql（当初のリファレンス案）から簡略化。
-- 変更点：
--   - ユーザーアカウント（Supabase Auth / OAuth）は導入しない。
--     投稿者はログイン不要で投稿し、連絡先はarticlesに直接スナップショットする。
--   - AI審査（ルールベース）は投稿をブロックしない。投稿は即時公開され、
--     review_logs は編集部の事後確認・不適切投稿の発見用ログとして書き込まれる。
--   - 不適切な投稿は編集部の判断で削除できる。削除にあたり投稿者への
--     事前連絡・通知は行わない（利用規約第5条・第9条に対応）。
--   - profiles テーブル・mypage・通知機能は廃止。ad_orders/content_reports の
--     担当者記録は編集部の運用メモ（テキスト）として簡略化する。
--
-- 実行順序に依存があるため、上から順に流すこと。
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";     -- 全文検索・重複投稿の類似度判定用

-- =============================================================================
-- 列挙型
-- =============================================================================

create type article_status as enum (
  'published',      -- 公開中（投稿と同時にこの状態になる）
  'withdrawn',       -- 投稿者からの申し出により取り下げ
  'removed'          -- 編集部が削除（規約違反・不適切な内容など。投稿者への通知なし）
);

create type article_source as enum (
  'user',           -- 一般ユーザーの無料投稿（ログイン不要）
  'sponsored',      -- 有料の広告記事（PR表記が必須）
  'editorial',      -- 編集部記事
  'legacy'          -- 旧 /blog/ から移行した編集部記事
);

create type review_verdict as enum (
  'clean', 'flagged'   -- ルールベース審査の結果。公開はブロックしない、社内確認用
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
-- ログイン不要のため author への外部キーは持たず、投稿時の連絡先を
-- そのままスナップショットする（display_name が記事のバイライン表示名）。
-- =============================================================================

create table articles (
  id                bigint generated always as identity primary key,

  display_name      text not null,          -- 会社名・団体名・ニックネーム（記事に表示）
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

  -- 記事に関するお問い合わせ先（投稿時のスナップショット。非公開項目は contact_public で制御）
  contact_org       text not null,
  contact_email     text not null,          -- 通知・編集部からの連絡先。非公開
  contact_tel       text,
  contact_url       text,
  contact_public    boolean not null default false,

  -- 投稿者本人による削除申請用（ログインなしなので簡易トークン方式）
  edit_token        text not null default encode(gen_random_bytes(16), 'hex'),

  published_at      timestamptz not null default now(),
  edit_deadline     timestamptz,            -- published_at + 1ヶ月
  withdrawn_at      timestamptz,
  withdrawn_reason  text,
  removed_at        timestamptz,
  removed_reason    text,                   -- 編集部の運用メモ。投稿者には通知しない

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint sponsored_link_cap check (
    (is_sponsored and link_count <= 5) or (not is_sponsored and link_count <= 2)
  ),
  constraint image_cap check (image_count <= 5)
);

create index on articles (status, published_at desc);
create index on articles (category_slug, published_at desc) where status = 'published';
create index on articles (is_sponsored, published_at desc) where status = 'published';
create index articles_body_trgm on articles using gin (body_text gin_trgm_ops);
create unique index articles_edit_token on articles (edit_token);

create or replace function set_article_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  if new.edit_deadline is null then
    new.edit_deadline := new.published_at + interval '1 month';
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_article_updated_at
  before insert or update on articles
  for each row execute function set_article_updated_at();

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
-- ad_orders — 広告枠の申込（¥20,000・請求書払い）
-- =============================================================================

create table ad_orders (
  id             bigserial primary key,
  order_no       text not null unique
                 default 'AD-' || to_char(now(),'YYYYMM') || '-' ||
                         lpad((nextval('ad_orders_id_seq'))::text, 4, '0'),

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
  handled_note text,                                -- 編集部の対応メモ（自由記入）
  handled_at   timestamptz,
  action_taken text,
  created_at   timestamptz not null default now()
);

create index on content_reports (article_id, created_at desc);
create index on content_reports (handled_at) where handled_at is null;

-- =============================================================================
-- Row Level Security
-- ログイン機構がないため、書き込みはすべてサーバー側（service role, RLSバイパス）
-- の Next.js API ルート経由のみ許可する。ブラウザ（anon key）は公開記事の
-- 読み取りのみ許可する。
-- =============================================================================

alter table articles       enable row level security;
alter table article_links  enable row level security;
alter table review_logs    enable row level security;
alter table ad_orders      enable row level security;
alter table article_stats  enable row level security;
alter table content_reports enable row level security;

-- articles：公開記事は誰でも読める。書き込みはservice role経由のみ（ポリシーなし＝拒否）
create policy articles_public_read on articles
  for select using (status = 'published');

-- article_links：公開記事に紐づくものだけ読める
create policy links_public_read on article_links
  for select using (exists (
    select 1 from articles a where a.id = article_id and a.status = 'published'));

-- review_logs / ad_orders / article_stats / content_reports：
-- 編集部の管理画面はすべて service role 経由で操作するため、
-- anon/authenticated ロールへの read/write ポリシーは意図的に設定しない。

-- =============================================================================
-- 定期ジョブ（pg_cron または Vercel Cron から実行）
-- =============================================================================

-- 編集部の削除対応期限が来た通報などをリマインドする場合はここに追加。
-- 現状は「即時公開・事後確認」方式のため、公開をブロックする定期ジョブはない。
