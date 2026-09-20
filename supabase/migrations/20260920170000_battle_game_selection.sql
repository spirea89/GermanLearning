create table public.practice_games (
  game_key text primary key check (game_key ~ '^[a-z][a-z0-9_]{1,49}$'),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (char_length(category) between 1 and 60),
  levels text[] not null default '{}' check (levels <@ array['A1','A2','B1','B2','C1','C2']::text[]),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.practice_games(game_key,title,category,levels,sort_order) values
 ('opposites','Finden Sie das Gegenteil','Vocabulary',array['B1'],10),
 ('verb_past','Vergangenheitsformen der Verben','Grammar',array['B1'],20),
 ('prepositions','Präpositionalobjekte','Grammar',array['B1'],30);

create trigger practice_games_set_updated_at before update on public.practice_games for each row execute function public.set_updated_at();
alter table public.practice_games enable row level security;
create policy "Anyone reads active game catalog" on public.practice_games for select to anon,authenticated using (active or exists(select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins update game catalog" on public.practice_games for update to authenticated using (exists(select 1 from public.app_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.app_admins where user_id=(select auth.uid())));
grant select on public.practice_games to anon,authenticated;
grant update on public.practice_games to authenticated;

alter table public.contests add column selected_game_keys text[] not null default array['opposites','verb_past','prepositions'];

drop function if exists public.create_open_contest(text,integer,text,integer,timestamptz);
drop function if exists public.create_contest(text,integer,text,integer,timestamptz);

create function public.create_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_code text; v_available integer; v_valid_count integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_level not in ('A1','A2','B1','B2','C1','C2') or p_question_count not in (5,10,15) or p_response_time_seconds not between 10 and 120 then raise exception 'Invalid contest setup'; end if;
 if p_scheduled_for is null or p_scheduled_for<now()-interval '5 minutes' then raise exception 'Choose a future battle time'; end if;
 if char_length(trim(p_display_name)) not between 1 and 30 then raise exception 'Enter a display name'; end if;
 select count(*) into v_valid_count from practice_games where active and p_level=any(levels) and game_key=any(coalesce(p_game_keys,'{}'));
 if coalesce(cardinality(p_game_keys),0)=0 or v_valid_count<>cardinality(p_game_keys) then raise exception 'Select at least one game available for %',p_level; end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds,scheduled_for,selected_game_keys) values(v_code,auth.uid(),p_level,p_question_count,p_response_time_seconds,p_scheduled_for,p_game_keys) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question, jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active and 'opposites'=any(p_game_keys)
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','?'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active and 'prepositions'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_forms','title','Both past forms','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and 'verb_past'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6 and 'verb_past'=any(p_game_keys)
 ), chosen as (select * from pool order by random() limit p_question_count), numbered as (select row_number() over() position,* from chosen)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from numbered;
 get diagnostics v_available=row_count;
 if v_available<p_question_count then raise exception 'Not enough questions are available for the selected games at %',p_level; end if;
 perform schedule_battle_block(v_id,auth.uid());
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;

create function public.create_open_contest(p_level text,p_question_count integer,p_display_name text,p_response_time_seconds integer,p_scheduled_for timestamptz,p_game_keys text[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_id uuid;
begin
 v_result:=public.create_contest(p_level,p_question_count,p_display_name,p_response_time_seconds,p_scheduled_for,p_game_keys);
 v_id:=(v_result->>'id')::uuid;
 update contests set visibility='open' where id=v_id and organizer_id=auth.uid();
 return v_result;
end $$;

grant execute on function public.create_contest(text,integer,text,integer,timestamptz,text[]),public.create_open_contest(text,integer,text,integer,timestamptz,text[]) to authenticated;
