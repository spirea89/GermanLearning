create table public.noun_case_content (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  prompt text not null check (position('___' in prompt)>0),
  correct_answer text not null check (char_length(correct_answer) between 1 and 80),
  base_article text not null check (base_article in ('der','die','das')),
  noun text not null check (char_length(noun) between 1 and 80),
  grammatical_case text not null check (grammatical_case in ('Nominativ','Akkusativ','Dativ','Genitiv')),
  determiner_type text not null default 'definite' check (determiner_type in ('definite','indefinite','possessive')),
  english_translation text not null default '',
  explanation text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger noun_case_content_set_updated_at before update on public.noun_case_content
for each row execute function public.set_updated_at();

alter table public.noun_case_content enable row level security;
create policy "Anyone reads active noun case content" on public.noun_case_content
for select to anon,authenticated using (active or exists(select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins create noun case content" on public.noun_case_content
for insert to authenticated with check (exists(select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins update noun case content" on public.noun_case_content
for update to authenticated using (exists(select 1 from public.app_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins delete noun case content" on public.noun_case_content
for delete to authenticated using (exists(select 1 from public.app_admins where user_id=(select auth.uid())));
grant select on public.noun_case_content to anon,authenticated;
grant insert,update,delete on public.noun_case_content to authenticated;

insert into public.practice_games(game_key,title,category,levels,active,sort_order)
values('noun_cases','Artikel & Kasus','Grammar · noun groups',array['A1','A2'],true,50)
on conflict(game_key) do update set title=excluded.title,category=excluded.category,levels=excluded.levels,active=true;

insert into public.noun_case_content(level,prompt,correct_answer,base_article,noun,grammatical_case,determiner_type,english_translation,explanation,sort_order) values
('A1','___ Mann arbeitet heute.','Der','der','Mann','Nominativ','definite','The man is working today.','Masculine nominative uses der.',10),
('A1','___ Frau kommt aus Wien.','Die','die','Frau','Nominativ','definite','The woman comes from Vienna.','Feminine nominative uses die.',20),
('A1','___ Kind spielt draußen.','Das','das','Kind','Nominativ','definite','The child is playing outside.','Neuter nominative uses das.',30),
('A1','___ Hund ist sehr freundlich.','Mein','der','Hund','Nominativ','possessive','My dog is very friendly.','Masculine nominative possessive has no ending.',40),
('A1','___ Tasche ist neu.','Eine','die','Tasche','Nominativ','indefinite','A bag is new.','Feminine nominative uses eine.',50),
('A1','___ Auto ist schnell.','Ein','das','Auto','Nominativ','indefinite','A car is fast.','Neuter nominative uses ein.',60),
('A1','Ich sehe ___ Mann.','den','der','Mann','Akkusativ','definite','I see the man.','Masculine accusative changes der to den.',70),
('A1','Wir kaufen ___ Tisch.','einen','der','Tisch','Akkusativ','indefinite','We buy a table.','Masculine accusative adds -en.',80),
('A1','Sie besucht ___ Freundin.','ihre','die','Freundin','Akkusativ','possessive','She visits her friend.','Feminine accusative keeps the -e ending.',90),
('A1','Er liest ___ Buch.','das','das','Buch','Akkusativ','definite','He reads the book.','Neuter accusative stays das.',100),
('A1','Ich brauche ___ Stift.','meinen','der','Stift','Akkusativ','possessive','I need my pen.','Masculine accusative possessive adds -en.',110),
('A1','Wir haben ___ Wohnung.','eine','die','Wohnung','Akkusativ','indefinite','We have an apartment.','Feminine accusative uses eine.',120),
('A1','Das Kind isst ___ Apfel.','einen','der','Apfel','Akkusativ','indefinite','The child eats an apple.','Masculine accusative uses einen.',130),
('A1','Ich öffne ___ Fenster.','das','das','Fenster','Akkusativ','definite','I open the window.','Neuter accusative uses das.',140),
('A1','Er fragt ___ Lehrerin.','die','die','Lehrerin','Akkusativ','definite','He asks the teacher.','Feminine accusative uses die.',150),
('A1','Ich helfe ___ Mann.','dem','der','Mann','Dativ','definite','I help the man.','Masculine dative uses dem.',160),
('A1','Wir danken ___ Frau.','der','die','Frau','Dativ','definite','We thank the woman.','Feminine dative uses der.',170),
('A1','Sie gibt ___ Kind ein Buch.','dem','das','Kind','Dativ','definite','She gives the child a book.','Neuter dative uses dem.',180),
('A1','Ich fahre mit ___ Bus.','dem','der','Bus','Dativ','definite','I travel by bus.','mit always takes dative.',190),
('A1','Er spricht mit ___ Mutter.','seiner','die','Mutter','Dativ','possessive','He speaks with his mother.','Feminine dative possessive ends in -er.',200),
('A1','Das gehört ___ Kind.','einem','das','Kind','Dativ','indefinite','That belongs to a child.','Neuter dative indefinite ends in -em.',210),
('A1','Wir wohnen bei ___ Familie.','einer','die','Familie','Dativ','indefinite','We live with a family.','Feminine dative indefinite ends in -er.',220),
('A1','Das ist das Auto ___ Mannes.','des','der','Mann','Genitiv','definite','That is the man’s car.','Masculine genitive uses des; the noun often adds -s.',230),
('A1','Die Farbe ___ Hauses ist weiß.','des','das','Haus','Genitiv','definite','The colour of the house is white.','Neuter genitive uses des.',240),
('A2','___ neue Nachbar grüßt freundlich.','Der','der','Nachbar','Nominativ','definite','The new neighbour greets us politely.','Masculine nominative uses der.',10),
('A2','___ Kollegin organisiert das Treffen.','Meine','die','Kollegin','Nominativ','possessive','My colleague organises the meeting.','Feminine nominative possessive ends in -e.',20),
('A2','___ Museum öffnet um zehn Uhr.','Das','das','Museum','Nominativ','definite','The museum opens at ten.','Neuter nominative uses das.',30),
('A2','___ guter Plan hilft uns.','Ein','der','Plan','Nominativ','indefinite','A good plan helps us.','Masculine nominative uses ein.',40),
('A2','___ Idee klingt interessant.','Eine','die','Idee','Nominativ','indefinite','An idea sounds interesting.','Feminine nominative uses eine.',50),
('A2','___ Ergebnis überrascht alle.','Unser','das','Ergebnis','Nominativ','possessive','Our result surprises everyone.','Neuter nominative possessive has no ending.',60),
('A2','Wir besuchen ___ neuen Nachbarn.','den','der','Nachbar','Akkusativ','definite','We visit the new neighbour.','Masculine accusative uses den.',70),
('A2','Sie sucht ___ ruhigen Arbeitsplatz.','einen','der','Arbeitsplatz','Akkusativ','indefinite','She is looking for a quiet workplace.','Masculine accusative uses einen.',80),
('A2','Ich reserviere ___ großen Tisch.','einen','der','Tisch','Akkusativ','indefinite','I reserve a large table.','Masculine accusative adds -en.',90),
('A2','Er repariert ___ alte Fahrrad.','das','das','Fahrrad','Akkusativ','definite','He repairs the old bicycle.','Neuter accusative uses das.',100),
('A2','Wir planen ___ nächste Reise.','unsere','die','Reise','Akkusativ','possessive','We plan our next trip.','Feminine accusative possessive ends in -e.',110),
('A2','Kannst du ___ Termin verschieben?','den','der','Termin','Akkusativ','definite','Can you postpone the appointment?','Masculine accusative uses den.',120),
('A2','Ich nehme ___ Regenschirm mit.','meinen','der','Regenschirm','Akkusativ','possessive','I take my umbrella with me.','Masculine accusative possessive ends in -en.',130),
('A2','Sie erklärt ___ Aufgabe.','die','die','Aufgabe','Akkusativ','definite','She explains the task.','Feminine accusative uses die.',140),
('A2','Wir bestellen ___ vegetarische Gericht.','das','das','Gericht','Akkusativ','definite','We order the vegetarian dish.','Neuter accusative uses das.',150),
('A2','Ich antworte ___ neuen Kollegen.','dem','der','Kollege','Dativ','definite','I answer the new colleague.','Masculine dative uses dem.',160),
('A2','Sie hilft ___ älteren Dame.','der','die','Dame','Dativ','definite','She helps the elderly lady.','Feminine dative uses der.',170),
('A2','Wir vertrauen ___ erfahrenen Arzt.','einem','der','Arzt','Dativ','indefinite','We trust an experienced doctor.','Masculine dative indefinite ends in -em.',180),
('A2','Er fährt mit ___ neuen Auto.','seinem','das','Auto','Dativ','possessive','He drives his new car.','Neuter dative possessive ends in -em.',190),
('A2','Das Geschenk gehört ___ netten Nachbarin.','der','die','Nachbarin','Dativ','definite','The present belongs to the nice neighbour.','Feminine dative uses der.',200),
('A2','Nach ___ langen Gespräch gehen wir.','dem','das','Gespräch','Dativ','definite','After the long conversation, we leave.','nach always takes dative.',210),
('A2','Ich komme aus ___ kleinen Stadt.','einer','die','Stadt','Dativ','indefinite','I come from a small town.','aus takes dative; feminine uses einer.',220),
('A2','Wegen ___ schlechten Wetters bleiben wir zu Hause.','des','das','Wetter','Genitiv','definite','Because of the bad weather, we stay home.','Formal wegen takes genitive.',230),
('A2','Der Name ___ neuen Kollegin ist Anna.','der','die','Kollegin','Genitiv','definite','The new colleague’s name is Anna.','Feminine genitive uses der.',240);

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
 where selected.game_key in ('opposites','prepositions','verb_past_forms','verb_past_sentences','room_objects','noun_cases')
 and exists(select 1 from practice_games g where g.active and p_level=any(g.levels) and g.game_key=case when selected.game_key like 'verb_past_%' then 'verb_past' else selected.game_key end)
 and case selected.game_key
   when 'opposites' then exists(select 1 from game_content where level=p_level and game_key='opposites' and active)
   when 'prepositions' then exists(select 1 from preposition_game_content where level=p_level and active)
   when 'verb_past_forms' then exists(select 1 from verb_game_content where level=p_level and active)
   when 'verb_past_sentences' then exists(select 1 from verb_game_content where level=p_level and active and cardinality(present_sentences)=6)
   when 'room_objects' then exists(select 1 from room_object_content where level=p_level and active)
   when 'noun_cases' then exists(select 1 from noun_case_content where level=p_level and active)
 end;
 if coalesce(cardinality(p_game_keys),0)=0 or v_valid_count<>cardinality(p_game_keys) then raise exception 'Select at least one game with active content for %',p_level; end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||auth.uid()::text),1,6)); exit when not exists(select 1 from contests where join_code=v_code); end loop;
 insert into contests(join_code,organizer_id,level,question_count,response_time_seconds,scheduled_for,selected_game_keys,map_type) values(v_code,auth.uid(),p_level,v_required,p_response_time_seconds,p_scheduled_for,p_game_keys,p_map_type) returning id into v_id;
 insert into contest_players(contest_id,user_id,display_name) values(v_id,auth.uid(),trim(p_display_name));
 with pool as (
   select jsonb_build_object('game','opposites','title','Find the opposite','prompt',phrase_before||target_word||phrase_after,'focus',target_word,'translation',coalesce(hint,''),'answer_labels',jsonb_build_array('Opposite')) question,jsonb_build_array(opposite_word) answers from game_content where level=p_level and game_key='opposites' and active and 'opposites'=any(p_game_keys)
   union all select jsonb_build_object('game','prepositions','title','Prepositional object','prompt',replace(prompt,'___','…'),'focus',construction||' + '||grammatical_case,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from preposition_game_content where level=p_level and active and 'prepositions'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_forms','title','Verb forms · Präteritum & Perfekt','prompt',(array['ich','du','er/sie/es','wir','ihr','sie/Sie'])[n]||' '||present_forms[n],'focus',infinitive||' · '||english_translation,'translation','Perfekt uses '||perfect_auxiliary,'answer_labels',jsonb_build_array('Präteritum','Perfekt')),jsonb_build_array(preterite_forms[n],(case when perfect_auxiliary='sein' then (array['bin','bist','ist','sind','seid','sind'])[n] else (array['habe','hast','hat','haben','habt','haben'])[n] end)||' '||participle) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and 'verb_past_forms'=any(p_game_keys)
   union all select jsonb_build_object('game','verb_context','title','Sentence transformation · Präteritum & Perfekt','prompt',present_sentences[n],'focus',infinitive,'translation',sentence_translations[n],'answer_labels',jsonb_build_array('Präteritum sentence','Perfekt sentence')),jsonb_build_array(preterite_sentences[n],perfect_sentences[n]) from verb_game_content cross join generate_series(1,6)n where level=p_level and active and cardinality(present_sentences)=6 and 'verb_past_sentences'=any(p_game_keys)
   union all select jsonb_build_object('game','room_objects','title','Was ist das?','prompt','Name the object','focus',room_title,'translation','Type the German article and noun.','answer_labels',jsonb_build_array('Article + noun'),'image_url',battle_image_url,'crop',jsonb_build_object('x',battle_crop_x,'y',battle_crop_y,'width',battle_crop_width,'height',battle_crop_height)),jsonb_build_array(article||' '||noun) from room_object_content where level=p_level and active and 'room_objects'=any(p_game_keys)
   union all select jsonb_build_object('game','noun_cases','title','Artikel & Kasus','prompt',replace(prompt,'___','…')||case when p_level in ('A1','A2') then ' ('||base_article||' '||noun||')' else '' end,'focus',grammatical_case||' · '||determiner_type,'translation',english_translation,'answer_labels',jsonb_build_array('Correct form')),jsonb_build_array(correct_answer) from noun_case_content where level=p_level and active and 'noun_cases'=any(p_game_keys)
 ),chosen as (select * from pool order by random() limit v_required),numbered as (select row_number() over() position,* from chosen)
 insert into contest_questions(contest_id,position,question,correct_answers) select v_id,position,question,answers from numbered;
 get diagnostics v_available=row_count;
 if v_available<v_required then raise exception 'At least % questions are required for the selected games at %',v_required,p_level; end if;
 perform schedule_battle_block(v_id,auth.uid());
 return jsonb_build_object('id',v_id,'join_code',v_code);
end $$;
