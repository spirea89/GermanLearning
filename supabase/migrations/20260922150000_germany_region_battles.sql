alter table public.contests drop constraint if exists contests_question_count_check;
alter table public.contests add constraint contests_question_count_check check (question_count in (5,10,15,16));

alter table public.contest_players
  add column regions_won integer not null default 0,
  add column correct_response_ms bigint not null default 0;

alter table public.contest_answers
  add column response_ms integer;

create table public.contest_region_awards (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  question_id uuid not null references public.contest_questions(id) on delete cascade,
  position integer not null check (position between 1 and 16),
  region text,
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_name text,
  response_ms integer,
  created_at timestamptz not null default now(),
  unique(contest_id,question_id),
  unique(contest_id,region),
  check ((region is null and winner_user_id is null) or (region is not null and winner_user_id is not null))
);

alter table public.contest_region_awards enable row level security;
create policy "Players read battle region awards" on public.contest_region_awards for select to authenticated
using (public.is_contest_member(contest_id));
grant select on public.contest_region_awards to authenticated;

create or replace function public.create_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer; v_valid_count integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count<>16 or p_response_time_seconds not between 10 and 120 then raise exception 'Battles must contain exactly 16 questions'; end if;
 if p_scheduled_for is null or p_scheduled_for<now()-interval '5 minutes' then raise exception 'Choose a future battle time'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 select count(*) into v_valid_count from practice_games where active and p_level=any(levels) and game_key=any(coalesce(p_game_keys,'{}'));
 if coalesce(cardinality(p_game_keys),0)=0 or v_valid_count<>cardinality(p_game_keys) then raise exception 'Select at least one game available for %',p_level; end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds,scheduled_for,selected_game_keys) values(v_code,auth.uid(),p_level,16,p_response_time_seconds,p_scheduled_for,p_game_keys) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question, jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active and 'opposites'=any(p_game_keys)
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','?'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active and 'prepositions'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_forms','title','Both past forms','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and 'verb_past'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6 and 'verb_past'=any(p_game_keys)
 ), chosen as (select * from pool order by random() limit 16), numbered as (select row_number() over() position,* from chosen)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from numbered;
 get diagnostics v_available=row_count;
 if v_available<16 then raise exception 'At least 16 questions are required for the selected games at %',p_level; end if;
 perform schedule_battle_block(v_id,auth.uid());
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;

create or replace function public.submit_contest_answer(p_contest_id uuid,p_position integer,p_response jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_question contest_questions; v_player contest_players; v_limit integer; v_correct boolean; v_timed_out boolean; v_score integer; v_answered integer; v_expected text; v_actual text; v_finished boolean:=false; v_response_ms integer; v_region text; v_winner record;
begin
 select p.* into v_player from contests c join contest_players p on p.contest_id=c.id where c.id=p_contest_id and c.status='active' and p.user_id=auth.uid() for update of p;
 if v_player.id is null then raise exception 'Contest is not active'; end if;
 if v_player.answered_count+1<>p_position then raise exception 'Answer questions in order'; end if;
 select response_time_seconds into v_limit from contests where id=p_contest_id;
 select * into v_question from contest_questions where contest_id=p_contest_id and position=p_position;
 if v_question.id is null then raise exception 'Question not found'; end if;
 if exists(select 1 from contest_answers where question_id=v_question.id and user_id=auth.uid()) then raise exception 'Question already answered'; end if;
 v_response_ms:=greatest(0,least(v_limit*1000,(extract(epoch from (now()-coalesce(v_player.question_started_at,now())))*1000)::integer));
 v_timed_out:=now()>coalesce(v_player.question_started_at,now())+make_interval(secs=>v_limit);
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_actual from jsonb_array_elements_text(p_response) with ordinality;
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_expected from jsonb_array_elements_text(v_question.correct_answers) with ordinality;
 v_correct:=not v_timed_out and v_actual is not null and v_actual=v_expected;
 insert into contest_answers(contest_id,question_id,user_id,response,correct,response_ms) values(p_contest_id,v_question.id,auth.uid(),p_response,v_correct,v_response_ms);
 update contest_players set score=score+(case when v_correct then 1 else 0 end),correct_response_ms=correct_response_ms+(case when v_correct then v_response_ms else 0 end),answered_count=answered_count+1,question_started_at=now() where id=v_player.id returning score,answered_count into v_score,v_answered;

 if (select count(*) from contest_answers where question_id=v_question.id)=(select count(*) from contest_players where contest_id=p_contest_id) then
   select a.user_id,p.display_name,a.response_ms into v_winner from contest_answers a join contest_players p on p.contest_id=a.contest_id and p.user_id=a.user_id where a.question_id=v_question.id and a.correct order by a.response_ms,a.answered_at limit 1;
   if v_winner.user_id is not null then
     select candidate.region_name into v_region from unnest(array['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern','Bremen','Lower Saxony','Brandenburg','Berlin','Saxony-Anhalt','North Rhine-Westphalia','Hesse','Thuringia','Saxony','Rhineland-Palatinate','Saarland','Baden-Württemberg','Bavaria']) as candidate(region_name) where not exists(select 1 from contest_region_awards r where r.contest_id=p_contest_id and r.region=candidate.region_name) order by random() limit 1;
     insert into contest_region_awards(contest_id,question_id,position,region,winner_user_id,winner_name,response_ms) values(p_contest_id,v_question.id,p_position,v_region,v_winner.user_id,v_winner.display_name,v_winner.response_ms) on conflict(contest_id,question_id) do nothing;
     if found then update contest_players set regions_won=regions_won+1 where contest_id=p_contest_id and user_id=v_winner.user_id; end if;
   else
     insert into contest_region_awards(contest_id,question_id,position) values(p_contest_id,v_question.id,p_position) on conflict(contest_id,question_id) do nothing;
   end if;
   update contest_players set question_started_at=now() where contest_id=p_contest_id;
 end if;
 if not exists(select 1 from contest_players where contest_id=p_contest_id and answered_count<16) then
   update contests set status='finished',finished_at=now() where id=p_contest_id;
   perform finish_contest_calendar(p_contest_id); v_finished:=true;
 end if;
 return jsonb_build_object('correct',v_correct,'expected',v_question.correct_answers,'score',v_score,'answered_count',v_answered,'timed_out',v_timed_out,'finished',v_finished,'position',p_position);
end $$;

create or replace function public.finish_contest_calendar(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 with ranked as (
   select user_id,row_number() over(order by regions_won desc,case when score=0 then 9223372036854775807 else correct_response_ms end,joined_at) rank
   from contest_players where contest_id=p_contest_id
 )
 update learning_blocks b set battle_rank=r.rank,title='German Battle · '||r.rank||case when r.rank%100 between 11 and 13 then 'th' when r.rank%10=1 then 'st' when r.rank%10=2 then 'nd' when r.rank%10=3 then 'rd' else 'th' end||' place',updated_at=now()
 from ranked r where b.battle_id=p_contest_id and b.user_id=r.user_id;
end $$;

revoke all on function public.finish_contest_calendar(uuid) from public;
