alter table public.learning_blocks drop constraint learning_blocks_source_check;
alter table public.learning_blocks add constraint learning_blocks_source_check
check (source in ('manual', 'google', 'outlook', 'apple', 'practice'));

create table public.practice_daily_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_date date not null,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  first_started_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  learning_block_id uuid references public.learning_blocks(id) on delete set null,
  primary key (user_id, practice_date)
);

alter table public.practice_daily_totals enable row level security;
create policy "Users view their own practice totals" on public.practice_daily_totals
for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.practice_daily_totals to authenticated;

create or replace function public.record_practice_time(seconds_played integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_practice_date date := (now() at time zone 'Europe/Vienna')::date;
  accumulated_seconds integer;
  session_start timestamptz;
  calendar_block_id uuid;
  display_minutes integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if seconds_played < 1 or seconds_played > 3600 then raise exception 'Invalid practice duration'; end if;

  insert into public.practice_daily_totals (user_id, practice_date, total_seconds)
  values (current_user_id, current_practice_date, seconds_played)
  on conflict (user_id, practice_date) do update
  set total_seconds = public.practice_daily_totals.total_seconds + excluded.total_seconds,
      last_played_at = now()
  returning total_seconds, first_started_at, learning_block_id
  into accumulated_seconds, session_start, calendar_block_id;

  display_minutes := greatest(1, round(accumulated_seconds / 60.0));
  if calendar_block_id is null then
    insert into public.learning_blocks (user_id, title, starts_at, ends_at, kind, source)
    values (current_user_id, 'Practice games · ' || display_minutes || ' min', session_start, session_start + make_interval(secs => greatest(accumulated_seconds, 60)), 'learning', 'practice')
    returning id into calendar_block_id;
    update public.practice_daily_totals set learning_block_id = calendar_block_id
    where user_id = current_user_id and practice_date = current_practice_date;
  else
    update public.learning_blocks
    set title = 'Practice games · ' || display_minutes || ' min',
        ends_at = session_start + make_interval(secs => greatest(accumulated_seconds, 60))
    where id = calendar_block_id and user_id = current_user_id;
  end if;

  return accumulated_seconds;
end;
$$;

revoke all on function public.record_practice_time(integer) from public;
grant execute on function public.record_practice_time(integer) to authenticated;
