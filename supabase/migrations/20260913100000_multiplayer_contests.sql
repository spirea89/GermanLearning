create table public.contests (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  question_count integer not null check (question_count in (5,10,15)),
  status text not null default 'lobby' check (status in ('lobby','active','finished')),
  created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz
);
create table public.contest_players (
  id uuid primary key default gen_random_uuid(), contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  score integer not null default 0, answered_count integer not null default 0, joined_at timestamptz not null default now(),
  unique(contest_id,user_id)
);
create table public.contest_questions (
  id uuid primary key default gen_random_uuid(), contest_id uuid not null references public.contests(id) on delete cascade,
  position integer not null, question jsonb not null, correct_answers jsonb not null,
  unique(contest_id,position)
);
create table public.contest_answers (
  id uuid primary key default gen_random_uuid(), contest_id uuid not null references public.contests(id) on delete cascade,
  question_id uuid not null references public.contest_questions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  response jsonb not null, correct boolean not null, answered_at timestamptz not null default now(), unique(question_id,user_id)
);

alter table public.contests enable row level security; alter table public.contest_players enable row level security;
alter table public.contest_questions enable row level security; alter table public.contest_answers enable row level security;
create or replace function public.is_contest_member(p_contest_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from contest_players where contest_id=p_contest_id and user_id=auth.uid())$$;
create policy "Players read their contests" on public.contests for select to authenticated using (organizer_id=(select auth.uid()) or public.is_contest_member(id));
create policy "Players read leaderboard" on public.contest_players for select to authenticated using (public.is_contest_member(contest_id));
create policy "Players read public questions" on public.contest_questions for select to authenticated using (public.is_contest_member(contest_id));
create policy "Players read own answers" on public.contest_answers for select to authenticated using (user_id=(select auth.uid()));
grant select on public.contests,public.contest_players,public.contest_answers to authenticated;
grant select (id,contest_id,position,question) on public.contest_questions to authenticated;
grant execute on function public.is_contest_member(uuid) to authenticated;

create or replace function public.create_contest(p_level text,p_question_count integer,p_display_name text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count not in (5,10,15) then raise exception 'Invalid contest setup'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 loop v_code:=upper(substr(encode(gen_random_bytes(6),'hex'),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
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
 if v_available<p_question_count then raise exception 'Not enough questions are available for this level'; end if;
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;

create or replace function public.join_contest(p_join_code text,p_display_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_status text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select id,status into v_id,v_status from contests where join_code=upper(trim(p_join_code)) for update;
 if v_id is null then raise exception 'Contest not found'; end if; if v_status<>'lobby' then raise exception 'This contest has already started'; end if;
 if not exists(select 1 from contest_players where contest_id=v_id and user_id=auth.uid()) and (select count(*) from contest_players where contest_id=v_id)>=10 then raise exception 'This contest is full'; end if;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name)) on conflict(contest_id,user_id) do update set display_name=excluded.display_name;
 return v_id;
end $$;

create or replace function public.start_contest(p_contest_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin update contests set status='active',started_at=now() where id=p_contest_id and organizer_id=auth.uid() and status='lobby';if not found then raise exception 'Only the organizer can start this contest';end if;end $$;

create or replace function public.submit_contest_answer(p_contest_id uuid,p_position integer,p_response jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_question contest_questions; v_correct boolean; v_score integer; v_answered integer; v_expected text; v_actual text;
begin
 if not exists(select 1 from contests c join contest_players p on p.contest_id=c.id where c.id=p_contest_id and c.status='active' and p.user_id=auth.uid()) then raise exception 'Contest is not active';end if;
 select * into v_question from contest_questions where contest_id=p_contest_id and position=p_position;
 if v_question.id is null then raise exception 'Question not found';end if;
 if exists(select 1 from contest_answers where question_id=v_question.id and user_id=auth.uid()) then raise exception 'Question already answered';end if;
 select string_agg(lower(trim(value)),E'\n' order by ordinality) into v_expected from jsonb_array_elements_text(v_question.correct_answers) with ordinality;
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_actual from jsonb_array_elements_text(p_response) with ordinality;
 select string_agg(lower(trim(regexp_replace(value,'[.!?]+$',''))),E'\n' order by ordinality) into v_expected from jsonb_array_elements_text(v_question.correct_answers) with ordinality;
 v_correct:=v_actual=v_expected;
 insert into contest_answers(contest_id,question_id,user_id,response,correct) values(p_contest_id,v_question.id,auth.uid(),p_response,v_correct);
 update contest_players set score=score+(case when v_correct then 1 else 0 end),answered_count=answered_count+1 where contest_id=p_contest_id and user_id=auth.uid() returning score,answered_count into v_score,v_answered;
 if not exists(select 1 from contest_players where contest_id=p_contest_id and answered_count<(select question_count from contests where id=p_contest_id)) then update contests set status='finished',finished_at=now() where id=p_contest_id;end if;
 return jsonb_build_object('correct',v_correct,'expected',v_question.correct_answers,'score',v_score,'answered_count',v_answered);
end $$;
grant execute on function public.create_contest(text,integer,text),public.join_contest(text,text),public.start_contest(uuid),public.submit_contest_answer(uuid,integer,jsonb) to authenticated;
