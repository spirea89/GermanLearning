create or replace function public.create_contest(p_level text,p_question_count integer,p_display_name text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count not in (5,10,15) then raise exception 'Invalid contest setup'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 loop
   v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6));
   exit when not exists(select 1 from contests where join_code=v_code);
 end loop;
 insert into contests(join_code,organizer_id,level,question_count) values(v_code,auth.uid(),p_level,p_question_count) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question, jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','?'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active
   union all select jsonb_build_object('game','verb_forms','title','Both past forms','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6
 ), chosen as (select * from pool order by random() limit p_question_count), numbered as (select row_number() over() position,* from chosen)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from numbered;
 get diagnostics v_available=row_count;
 if v_available<p_question_count then raise exception 'Not enough questions are available for % yet',p_level; end if;
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;
grant execute on function public.create_contest(text,integer,text) to authenticated;
