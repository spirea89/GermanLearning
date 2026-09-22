alter table public.contests
  add column start_mode text not null default 'later' check (start_mode in ('now','later')),
  add column lobby_expires_at timestamptz;

update public.contests
set lobby_expires_at=scheduled_for+interval '5 minutes'
where status='lobby' and lobby_expires_at is null;

create or replace function public.cleanup_expired_contests() returns integer language plpgsql security definer set search_path=public as $$
declare v_deleted integer;
begin
 delete from contests where status='lobby' and lobby_expires_at is not null and lobby_expires_at<=now();
 get diagnostics v_deleted=row_count;
 return v_deleted;
end $$;

revoke all on function public.cleanup_expired_contests() from public;

create function public.create_contest_v2(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[],p_map_type text,p_start_now boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
 v_result:=public.create_contest(p_level,p_question_count,p_display_name,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type);
 v_id:=(v_result->>'id')::uuid;
 update contests set start_mode=case when p_start_now then 'now' else 'later' end,lobby_expires_at=case when p_start_now then now()+interval '2 hours' else p_scheduled_for+interval '5 minutes' end where id=v_id and organizer_id=auth.uid();
 return v_result;
end $$;

create function public.create_open_contest_v2(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[],p_map_type text,p_start_now boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
 v_result:=public.create_contest_v2(p_level,p_question_count,p_display_name,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type,p_start_now);
 v_id:=(v_result->>'id')::uuid;
 update contests set visibility='open' where id=v_id and organizer_id=auth.uid();
 return v_result;
end $$;

create or replace function public.start_contest(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_started_at timestamptz:=now(); v_scheduled_for timestamptz; v_expires_at timestamptz;
begin
 select scheduled_for,lobby_expires_at into v_scheduled_for,v_expires_at from contests where id=p_contest_id and organizer_id=auth.uid() and status='lobby' for update;
 if v_scheduled_for is null then raise exception 'Only the organizer can start this contest'; end if;
 if v_expires_at is not null and v_started_at>=v_expires_at then delete from contests where id=p_contest_id; raise exception 'This battle expired because it was not started on time'; end if;
 if v_started_at<v_scheduled_for then raise exception 'This battle cannot start before its scheduled time'; end if;
 update contests set status='active',started_at=v_started_at where id=p_contest_id;
 update contest_players set question_started_at=v_started_at where contest_id=p_contest_id;
end $$;

create extension if not exists pg_cron with schema extensions;
select cron.schedule('cleanup-expired-lernzeit-battles','* * * * *','select public.cleanup_expired_contests()');

grant execute on function public.create_contest_v2(text,integer,text,integer,timestamptz,text[],text,boolean),public.create_open_contest_v2(text,integer,text,integer,timestamptz,text[],text,boolean) to authenticated;
