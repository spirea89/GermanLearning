alter table public.learning_blocks add column battle_score integer check (battle_score is null or battle_score >= 0);

update public.learning_blocks b
set battle_score=p.regions_won
from public.contest_players p
where b.battle_id=p.contest_id and b.user_id=p.user_id and b.battle_rank is not null;

create or replace function public.schedule_battle_block(p_contest_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_contest contests; v_minutes integer;
begin
 select * into v_contest from contests where id=p_contest_id;
 if v_contest.id is null then raise exception 'Battle not found'; end if;
 v_minutes:=greatest(15,ceil((v_contest.question_count*v_contest.response_time_seconds+300)/60.0)::integer);
 insert into learning_blocks(user_id,title,starts_at,ends_at,kind,source,battle_id)
 values(p_user_id,'German Battle · Scheduled',v_contest.scheduled_for,v_contest.scheduled_for+make_interval(mins=>v_minutes),'learning','battle',p_contest_id)
 on conflict(user_id,battle_id) where battle_id is not null do update
 set title=excluded.title,starts_at=excluded.starts_at,ends_at=excluded.ends_at,battle_rank=null,battle_score=null,updated_at=now();
end $$;

create or replace function public.finish_contest_calendar(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 with ranked as (
   select user_id,regions_won,row_number() over(order by regions_won desc,case when score=0 then 9223372036854775807 else correct_response_ms end,joined_at) rank
   from contest_players where contest_id=p_contest_id
 )
 update learning_blocks b set battle_rank=r.rank,battle_score=r.regions_won,title='German Battle · '||r.rank||case when r.rank%100 between 11 and 13 then 'th' when r.rank%10=1 then 'st' when r.rank%10=2 then 'nd' when r.rank%10=3 then 'rd' else 'th' end||' place · '||r.regions_won||case when r.regions_won=1 then ' region' else ' regions' end,updated_at=now()
 from ranked r where b.battle_id=p_contest_id and b.user_id=r.user_id;
end $$;

revoke all on function public.schedule_battle_block(uuid,uuid),public.finish_contest_calendar(uuid) from public;
