drop function if exists public.browse_open_contests();

create function public.browse_open_contests()
returns table(
  id uuid,
  level text,
  question_count integer,
  organizer_name text,
  player_count bigint,
  created_at timestamptz,
  is_organizer boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    c.id,
    c.level,
    c.question_count,
    coalesce(o.display_name,'Player'),
    count(p.id),
    c.created_at,
    c.organizer_id=auth.uid()
  from contests c
  join contest_players o on o.contest_id=c.id and o.user_id=c.organizer_id
  left join contest_players p on p.contest_id=c.id
  where auth.uid() is not null
    and c.visibility='open'
    and c.status='lobby'
  group by c.id,o.display_name
  having count(p.id)<10
  order by c.created_at desc
$$;

grant execute on function public.browse_open_contests() to authenticated;
