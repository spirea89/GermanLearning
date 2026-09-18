alter table public.contests
  add column response_time_seconds integer not null default 60
  check (response_time_seconds between 10 and 120);

alter table public.contest_players
  add column question_started_at timestamptz;

drop function if exists public.create_open_contest(text,integer,text);
drop function if exists public.create_contest(text,integer,text);

create function public.create_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer default 60) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count not in (5,10,15) or p_response_time_seconds not between 10 and 120 then raise exception 'Invalid contest setup'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 loop
   v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6));
   exit when not exists(select 1 from contests where join_code=v_code);
 end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds) values(v_code,auth.uid(),p_level,p_question_count,p_response_time_seconds) returning id into v_id;
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

create function public.create_open_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer default 60) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
  v_result:=public.create_contest(p_level,p_question_count,p_display_name,p_response_time_seconds);
  v_id:=(v_result->>'id')::uuid;
  update contests set visibility='open' where id=v_id and organizer_id=auth.uid();
  return v_result;
end $$;

drop function if exists public.browse_open_contests();
create function public.browse_open_contests() returns table(id uuid,level text,question_count integer,response_time_seconds integer,organizer_name text,player_count bigint,created_at timestamptz,is_organizer boolean) language sql stable security definer set search_path=public as $$
  select c.id,c.level,c.question_count,c.response_time_seconds,coalesce(o.display_name,'Player'),count(p.id),c.created_at,c.organizer_id=auth.uid()
  from contests c join contest_players o on o.contest_id=c.id and o.user_id=c.organizer_id
  left join contest_players p on p.contest_id=c.id
  where auth.uid() is not null and c.visibility='open' and c.status='lobby'
  group by c.id,o.display_name having count(p.id)<10 order by c.created_at desc
$$;

create or replace function public.start_contest(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_started_at timestamptz:=now();
begin
 update contests set status='active',started_at=v_started_at where id=p_contest_id and organizer_id=auth.uid() and status='lobby';
 if not found then raise exception 'Only the organizer can start this contest'; end if;
 update contest_players set question_started_at=v_started_at where contest_id=p_contest_id;
end $$;

create or replace function public.submit_contest_answer(p_contest_id uuid,p_position integer,p_response jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_question contest_questions; v_player contest_players; v_limit integer; v_correct boolean; v_timed_out boolean; v_score integer; v_answered integer; v_expected text; v_actual text;
begin
 select p.* into v_player from contests c join contest_players p on p.contest_id=c.id where c.id=p_contest_id and c.status='active' and p.user_id=auth.uid() for update of p;
 if v_player.id is null then raise exception 'Contest is not active'; end if;
 if v_player.answered_count+1<>p_position then raise exception 'Answer questions in order'; end if;
 select response_time_seconds into v_limit from contests where id=p_contest_id;
 select * into v_question from contest_questions where contest_id=p_contest_id and position=p_position;
 if v_question.id is null then raise exception 'Question not found'; end if;
 if exists(select 1 from contest_answers where question_id=v_question.id and user_id=auth.uid()) then raise exception 'Question already answered'; end if;
 v_timed_out:=now()>coalesce(v_player.question_started_at,now())+make_interval(secs=>v_limit);
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_actual from jsonb_array_elements_text(p_response) with ordinality;
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_expected from jsonb_array_elements_text(v_question.correct_answers) with ordinality;
 v_correct:=not v_timed_out and v_actual is not null and v_actual=v_expected;
 insert into contest_answers(contest_id,question_id,user_id,response,correct) values(p_contest_id,v_question.id,auth.uid(),p_response,v_correct);
 update contest_players set score=score+(case when v_correct then 1 else 0 end),answered_count=answered_count+1,question_started_at=now() where id=v_player.id returning score,answered_count into v_score,v_answered;
 if not exists(select 1 from contest_players where contest_id=p_contest_id and answered_count<(select question_count from contests where id=p_contest_id)) then update contests set status='finished',finished_at=now() where id=p_contest_id; end if;
 return jsonb_build_object('correct',v_correct,'expected',v_question.correct_answers,'score',v_score,'answered_count',v_answered,'timed_out',v_timed_out);
end $$;

grant execute on function public.create_contest(text,integer,text,integer),public.create_open_contest(text,integer,text,integer),public.browse_open_contests() to authenticated;
