alter table public.contests add column map_type text not null default 'germany' check (map_type in ('germany','vienna'));
alter table public.contests drop constraint if exists contests_question_count_check;
alter table public.contests add constraint contests_question_count_check check (question_count in (5,10,15,16,23));
alter table public.contest_region_awards drop constraint if exists contest_region_awards_position_check;
alter table public.contest_region_awards add constraint contest_region_awards_position_check check (position between 1 and 23);

create or replace function public.battle_territories(p_map_type text) returns text[] language sql immutable set search_path=public as $$
 select case p_map_type
  when 'vienna' then array['1. Innere Stadt','2. Leopoldstadt','3. Landstraße','4. Wieden','5. Margareten','6. Mariahilf','7. Neubau','8. Josefstadt','9. Alsergrund','10. Favoriten','11. Simmering','12. Meidling','13. Hietzing','14. Penzing','15. Rudolfsheim-Fünfhaus','16. Ottakring','17. Hernals','18. Währing','19. Döbling','20. Brigittenau','21. Floridsdorf','22. Donaustadt','23. Liesing']
  else array['Schleswig-Holstein','Hamburg','Mecklenburg-Vorpommern','Bremen','Lower Saxony','Brandenburg','Berlin','Saxony-Anhalt','North Rhine-Westphalia','Hesse','Thuringia','Saxony','Rhineland-Palatinate','Saarland','Baden-Württemberg','Bavaria'] end
$$;

drop function if exists public.create_open_contest(text,integer,text,integer,timestamptz,text[]);
drop function if exists public.create_contest(text,integer,text,integer,timestamptz,text[]);

create function public.create_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[],p_map_type text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer; v_valid_count integer; v_required integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_map_type not in ('germany','vienna') then raise exception 'Choose Germany or Vienna'; end if;
 v_required:=case when p_map_type='vienna' then 23 else 16 end;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count<>v_required or p_response_time_seconds not between 10 and 120 then raise exception '% battles must contain exactly % questions',initcap(p_map_type),v_required; end if;
 if p_scheduled_for is null or p_scheduled_for<now()-interval '5 minutes' then raise exception 'Choose a future battle time'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 select count(*) into v_valid_count from practice_games where active and p_level=any(levels) and game_key=any(coalesce(p_game_keys,'{}'));
 if coalesce(cardinality(p_game_keys),0)=0 or v_valid_count<>cardinality(p_game_keys) then raise exception 'Select at least one game available for %',p_level; end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds,scheduled_for,selected_game_keys,map_type) values(v_code,auth.uid(),p_level,v_required,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question, jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active and 'opposites'=any(p_game_keys)
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','?'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active and 'prepositions'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_forms','title','Both past forms','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and 'verb_past'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6 and 'verb_past'=any(p_game_keys)
 ), chosen as (select * from pool order by random() limit v_required), numbered as (select row_number() over() position,* from chosen)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from numbered;
 get diagnostics v_available=row_count;
 if v_available<v_required then raise exception 'At least % questions are required for the selected games at %',v_required,p_level; end if;
 perform schedule_battle_block(v_id,auth.uid());
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;

create function public.create_open_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[],p_map_type text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
 v_result:=public.create_contest(p_level,p_question_count,p_display_name,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type);
 v_id:=(v_result->>'id')::uuid;
 update contests set visibility='open' where id=v_id and organizer_id=auth.uid();
 return v_result;
end $$;

drop function if exists public.browse_open_contests();
create function public.browse_open_contests() returns table(id uuid,level text,question_count integer,response_time_seconds integer,scheduled_for timestamptz,map_type text,organizer_name text,player_count bigint,created_at timestamptz,is_organizer boolean) language sql stable security definer set search_path=public as $$
 select c.id,c.level,c.question_count,c.response_time_seconds,c.scheduled_for,c.map_type,coalesce(o.display_name,'Player'),count(p.id),c.created_at,c.organizer_id=auth.uid()
 from contests c join contest_players o on o.contest_id=c.id and o.user_id=c.organizer_id left join contest_players p on p.contest_id=c.id
 where auth.uid() is not null and c.visibility='open' and c.status='lobby'
 group by c.id,o.display_name having count(p.id)<10 order by c.scheduled_for,c.created_at desc
$$;

create or replace function public.submit_contest_answer(p_contest_id uuid,p_position integer,p_response jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_question contest_questions; v_player contest_players; v_limit integer; v_correct boolean; v_timed_out boolean; v_score integer; v_answered integer; v_expected text; v_actual text; v_finished boolean:=false; v_response_ms integer; v_region text; v_winner record; v_question_count integer; v_map_type text;
begin
 select p.* into v_player from contests c join contest_players p on p.contest_id=c.id where c.id=p_contest_id and c.status='active' and p.user_id=auth.uid() for update of p;
 if v_player.id is null then raise exception 'Contest is not active'; end if;
 if v_player.answered_count+1<>p_position then raise exception 'Answer questions in order'; end if;
 select response_time_seconds,question_count,map_type into v_limit,v_question_count,v_map_type from contests where id=p_contest_id;
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
     select candidate.name into v_region from unnest(public.battle_territories(v_map_type)) as candidate(name) where not exists(select 1 from contest_region_awards r where r.contest_id=p_contest_id and r.region=candidate.name) order by random() limit 1;
     insert into contest_region_awards(contest_id,question_id,position,region,winner_user_id,winner_name,response_ms) values(p_contest_id,v_question.id,p_position,v_region,v_winner.user_id,v_winner.display_name,v_winner.response_ms) on conflict(contest_id,question_id) do nothing;
     if found then update contest_players set regions_won=regions_won+1 where contest_id=p_contest_id and user_id=v_winner.user_id; end if;
   else insert into contest_region_awards(contest_id,question_id,position) values(p_contest_id,v_question.id,p_position) on conflict(contest_id,question_id) do nothing; end if;
   update contest_players set question_started_at=now() where contest_id=p_contest_id;
 end if;
 if not exists(select 1 from contest_players where contest_id=p_contest_id and answered_count<v_question_count) then update contests set status='finished',finished_at=now() where id=p_contest_id; perform finish_contest_calendar(p_contest_id); v_finished:=true; end if;
 return jsonb_build_object('correct',v_correct,'expected',v_question.correct_answers,'score',v_score,'answered_count',v_answered,'timed_out',v_timed_out,'finished',v_finished,'position',p_position);
end $$;

grant execute on function public.create_contest(text,integer,text,integer,timestamptz,text[],text),public.create_open_contest(text,integer,text,integer,timestamptz,text[],text),public.browse_open_contests() to authenticated;
revoke all on function public.battle_territories(text) from public;
