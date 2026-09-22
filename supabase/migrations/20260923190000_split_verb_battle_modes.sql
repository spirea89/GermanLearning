create or replace function public.create_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[],p_map_type text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer; v_valid_count integer; v_required integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_map_type not in ('germany','vienna') then raise exception 'Choose Germany or Vienna'; end if;
 v_required:=case when p_map_type='vienna' then 23 else 16 end;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count<>v_required or p_response_time_seconds not between 10 and 120 then raise exception '% battles must contain exactly % questions',initcap(p_map_type),v_required; end if;
 if p_scheduled_for is null or p_scheduled_for<now()-interval '5 minutes' then raise exception 'Choose a future battle time'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 select count(*) into v_valid_count from unnest(coalesce(p_game_keys,'{}')) selected(game_key)
 where selected.game_key in ('opposites','prepositions','verb_past_forms','verb_past_sentences')
 and exists(select 1 from practice_games g where g.active and p_level=any(g.levels) and g.game_key=case when selected.game_key like 'verb_past_%' then 'verb_past' else selected.game_key end);
 if coalesce(cardinality(p_game_keys),0)=0 or v_valid_count<>cardinality(p_game_keys) then raise exception 'Select at least one game available for %',p_level; end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds,scheduled_for,selected_game_keys,map_type) values(v_code,auth.uid(),p_level,v_required,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question, jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active and 'opposites'=any(p_game_keys)
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','?'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active and 'prepositions'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_forms','title','Verb forms · Präteritum & Perfekt','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and 'verb_past_forms'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation · Präteritum & Perfekt','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6 and 'verb_past_sentences'=any(p_game_keys)
 ), shuffled as (select row_number() over(order by random()) rn,count(*) over() pool_size,question,answers from pool),
 chosen as (select round.position,s.question,s.answers from generate_series(1,v_required) round(position) join shuffled s on s.rn=((round.position-1)%s.pool_size)+1)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from chosen;
 get diagnostics v_available=row_count;
 if v_available<v_required then raise exception 'No questions are available for the selected games at %',p_level; end if;
 perform schedule_battle_block(v_id,auth.uid());
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;
