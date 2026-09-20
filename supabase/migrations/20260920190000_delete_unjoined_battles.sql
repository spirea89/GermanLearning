create or replace function public.delete_contest(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_organizer uuid; v_status text; v_players integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select organizer_id,status into v_organizer,v_status from contests where id=p_contest_id for update;
 if v_organizer is null or v_organizer<>auth.uid() then raise exception 'Only the organizer can delete this battle'; end if;
 if v_status<>'lobby' then raise exception 'A battle can only be deleted before it starts'; end if;
 select count(*) into v_players from contest_players where contest_id=p_contest_id;
 if v_players>1 then raise exception 'This battle cannot be deleted because other players have joined'; end if;
 delete from contests where id=p_contest_id;
end $$;

revoke all on function public.delete_contest(uuid) from public;
grant execute on function public.delete_contest(uuid) to authenticated;
