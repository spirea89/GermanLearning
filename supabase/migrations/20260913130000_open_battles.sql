alter table public.contests add column visibility text not null default 'private' check (visibility in ('private','open'));

create or replace function public.create_open_contest(p_level text,p_question_count integer,p_display_name text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
  v_result:=public.create_contest(p_level,p_question_count,p_display_name);
  v_id:=(v_result->>'id')::uuid;
  update contests set visibility='open' where id=v_id and organizer_id=auth.uid();
  return v_result;
end $$;

create or replace function public.browse_open_contests() returns table(id uuid,level text,question_count integer,organizer_name text,player_count bigint,created_at timestamptz) language sql stable security definer set search_path=public as $$
  select c.id,c.level,c.question_count,coalesce(o.display_name,'Player'),count(p.id),c.created_at
  from contests c join contest_players o on o.contest_id=c.id and o.user_id=c.organizer_id
  left join contest_players p on p.contest_id=c.id
  where auth.uid() is not null and c.visibility='open' and c.status='lobby'
  group by c.id,o.display_name having count(p.id)<10 order by c.created_at desc
$$;

create or replace function public.join_open_contest(p_contest_id uuid,p_display_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_code text;
begin
  select join_code into v_code from contests where id=p_contest_id and visibility='open' and status='lobby';
  if v_code is null then raise exception 'This open battle is no longer available'; end if;
  return public.join_contest(v_code,p_display_name);
end $$;

grant execute on function public.create_open_contest(text,integer,text),public.browse_open_contests(),public.join_open_contest(uuid,text) to authenticated;
