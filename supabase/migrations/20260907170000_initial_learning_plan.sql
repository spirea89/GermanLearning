create extension if not exists pgcrypto;

create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  weekly_goal_minutes integer not null default 420 check (weekly_goal_minutes between 30 and 10080),
  timezone text not null default 'Europe/Vienna',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'learning' check (kind in ('learning', 'busy')),
  source text not null default 'manual' check (source in ('manual', 'google', 'outlook', 'apple')),
  external_event_id text,
  external_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_blocks_valid_time check (ends_at > starts_at)
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'outlook', 'apple')),
  provider_account_id text not null,
  display_name text,
  account_email text,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create index learning_blocks_user_time_idx on public.learning_blocks (user_id, starts_at, ends_at);
create index calendar_connections_user_idx on public.calendar_connections (user_id, provider);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger learning_plans_set_updated_at before update on public.learning_plans
for each row execute function public.set_updated_at();
create trigger learning_blocks_set_updated_at before update on public.learning_blocks
for each row execute function public.set_updated_at();
create trigger calendar_connections_set_updated_at before update on public.calendar_connections
for each row execute function public.set_updated_at();

alter table public.learning_plans enable row level security;
alter table public.learning_blocks enable row level security;
alter table public.calendar_connections enable row level security;

create policy "Users manage their own learning plan" on public.learning_plans
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own learning blocks" on public.learning_blocks
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users view their own calendar connections" on public.calendar_connections
for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.learning_plans to authenticated;
grant select, insert, update, delete on public.learning_blocks to authenticated;
grant select on public.calendar_connections to authenticated;

comment on table public.calendar_connections is 'Calendar account metadata only. OAuth credentials belong in server-side encrypted secrets, never in this table.';
