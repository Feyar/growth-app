-- ============================================================================
-- 成长系统 — Supabase 建表 SQL
-- 遵循 Supabase 项目初始化规范：
--   1. 每表开 RLS
--   2. 必带 id(uuid PK) + created_at + updated_at
--   3. 表名前缀 growth_
--   4. 枚举用 check 约束
--   5. 外键建索引
--   6. timestamptz 不用 timestamp
--   7. meta jsonb 兜底扩展
--   8. 软删除用 archived boolean
--   9. 全文搜索用 pg tsvector
-- 依赖：初始化 SQL（profiles / set_updated_at 等）已运行
-- ============================================================================

-- ─── 1. growth_plans 规划树 ───────────────────────────────────────────────
create table if not exists public.growth_plans (
  id          uuid primary key default gen_random_uuid(),
  uid         uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.growth_plans(id) on delete set null,
  level       text not null check (level in ('vision','annual','quarterly','monthly','weekly','daily')),
  area        text not null default 'general' check (area in ('career','finance','health','family','general')),
  title       text not null,
  description text,
  progress    smallint not null default 0 check (progress between 0 and 100),
  status      text not null default 'not_started' check (status in ('not_started','in_progress','completed','paused','abandoned')),
  start_date  date,
  end_date    date,
  sort_order  int not null default 0,
  is_current  boolean not null default false,
  archived    boolean not null default false,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.growth_plans enable row level security;
drop policy if exists "growth_plans_owner" on public.growth_plans;
create policy "growth_plans_owner" on public.growth_plans
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
drop trigger if exists trg_growth_plans_updated on public.growth_plans;
create trigger trg_growth_plans_updated before update on public.growth_plans
  for each row execute function public.set_updated_at();
create index if not exists idx_growth_plans_parent on public.growth_plans (uid, parent_id);
create index if not exists idx_growth_plans_level on public.growth_plans (uid, level, start_date);
create index if not exists idx_growth_plans_status on public.growth_plans (uid, status);

-- ─── 2. growth_check_ins 每日打卡 ─────────────────────────────────────────
create table if not exists public.growth_check_ins (
  id              uuid primary key default gen_random_uuid(),
  uid             uuid not null references auth.users(id) on delete cascade,
  plan_id         uuid references public.growth_plans(id) on delete set null,
  check_in_date   date not null,
  completed_count smallint not null default 0 check (completed_count >= 0),
  total_count     smallint not null default 0 check (total_count >= 0),
  energy_level    smallint check (energy_level between 1 and 5),
  note            text,
  archived        boolean not null default false,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(uid, check_in_date)
);
alter table public.growth_check_ins enable row level security;
drop policy if exists "growth_check_ins_owner" on public.growth_check_ins;
create policy "growth_check_ins_owner" on public.growth_check_ins
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
drop trigger if exists trg_growth_check_ins_updated on public.growth_check_ins;
create trigger trg_growth_check_ins_updated before update on public.growth_check_ins
  for each row execute function public.set_updated_at();
create index if not exists idx_growth_check_ins_date on public.growth_check_ins (uid, check_in_date desc);
create index if not exists idx_growth_check_ins_plan on public.growth_check_ins (uid, plan_id);

-- 全文搜索：打卡笔记
alter table public.growth_check_ins add column if not exists search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(note, ''))) stored;
create index if not exists idx_growth_check_ins_search on public.growth_check_ins using gin (search_vector);

-- ─── 3. growth_questions 每日一问 ─────────────────────────────────────────
create table if not exists public.growth_questions (
  id                uuid primary key default gen_random_uuid(),
  uid               uuid not null references auth.users(id) on delete cascade,
  question_date     date not null,
  original_question text not null,
  ai_deepened       text,
  my_answer         text,
  status            text not null default 'pondering' check (status in ('pondering','answered','published','abandoned')),
  article_url       text,
  tags              text[] not null default '{}',
  archived          boolean not null default false,
  meta              jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(uid, question_date)
);
alter table public.growth_questions enable row level security;
drop policy if exists "growth_questions_owner" on public.growth_questions;
create policy "growth_questions_owner" on public.growth_questions
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
drop trigger if exists trg_growth_questions_updated on public.growth_questions;
create trigger trg_growth_questions_updated before update on public.growth_questions
  for each row execute function public.set_updated_at();
create index if not exists idx_growth_questions_date on public.growth_questions (uid, question_date desc);
create index if not exists idx_growth_questions_tags on public.growth_questions using gin (tags);

-- 全文搜索：每日一问
alter table public.growth_questions add column if not exists search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(original_question, '') || ' ' || coalesce(ai_deepened, '') || ' ' || coalesce(my_answer, ''))) stored;
create index if not exists idx_growth_questions_search on public.growth_questions using gin (search_vector);

-- ─── 4. growth_kr_progress KR进度记录（趋势线用）───────────────────────────
create table if not exists public.growth_kr_progress (
  id          uuid primary key default gen_random_uuid(),
  uid         uuid not null references auth.users(id) on delete cascade,
  kr_id       uuid not null references public.growth_plans(id) on delete cascade,
  progress    smallint not null check (progress between 0 and 100),
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.growth_kr_progress enable row level security;
drop policy if exists "growth_kr_progress_owner" on public.growth_kr_progress;
create policy "growth_kr_progress_owner" on public.growth_kr_progress
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
create index if not exists idx_growth_kr_progress_kr on public.growth_kr_progress (kr_id, created_at);
create index if not exists idx_growth_kr_progress_uid on public.growth_kr_progress (uid, created_at desc);

-- ─── 5. growth_articles 文章记录（知识流水线终点）─────────────────────────
create table if not exists public.growth_articles (
  id            uuid primary key default gen_random_uuid(),
  uid           uuid not null references auth.users(id) on delete cascade,
  question_id   uuid references public.growth_questions(id) on delete set null,
  title         text not null,
  url           text,
  platform      text check (platform in ('csdn','juejin','zhihu','other')),
  word_count    int,
  published_at  date,
  status        text not null default 'draft' check (status in ('draft','published','abandoned')),
  archived      boolean not null default false,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.growth_articles enable row level security;
drop policy if exists "growth_articles_owner" on public.growth_articles;
create policy "growth_articles_owner" on public.growth_articles
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
drop trigger if exists trg_growth_articles_updated on public.growth_articles;
create trigger trg_growth_articles_updated before update on public.growth_articles
  for each row execute function public.set_updated_at();
create index if not exists idx_growth_articles_date on public.growth_articles (uid, published_at desc);
create index if not exists idx_growth_articles_question on public.growth_articles (question_id);

-- ─── 注册到门户（如果存在 projects 表）──────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects') then
    insert into public.projects (slug, name, description, href, sort_order, is_enabled)
    values ('growth', '成长系统', '个人规划与打卡', '/growth', 30, false)
    on conflict (slug) do nothing;
  end if;
end $$;
