create table public.preposition_game_content (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'B1' check (level in ('A1','A2','B1','B2','C1','C2')),
  prompt text not null check (position('___' in prompt) > 0),
  correct_answer text not null,
  response_example text not null,
  construction text not null,
  grammatical_case text not null check (grammatical_case in ('Akkusativ','Dativ','Genitiv')),
  reference_type text not null check (reference_type in ('thing','person')),
  english_translation text not null,
  explanation text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.preposition_game_content (prompt, correct_answer, response_example, construction, grammatical_case, reference_type, english_translation, explanation, sort_order)
values
  ('___ wartest du?', 'Worauf', 'Darauf warte ich.', 'warten auf', 'Akkusativ', 'thing', 'What are you waiting for?', 'For things, wo(r)- forms the question and da(r)- forms the answer.', 10),
  ('___ freust du dich?', 'Worauf', 'Darauf freue ich mich.', 'sich freuen auf', 'Akkusativ', 'thing', 'What are you looking forward to?', 'auf takes the accusative in this construction.', 20),
  ('___ hast du Angst?', 'Wovor', 'Davor habe ich Angst.', 'Angst haben vor', 'Dativ', 'thing', 'What are you afraid of?', 'vor begins with a consonant: wovor and davor.', 30),
  ('___ denkst du?', 'Woran', 'Daran denke ich.', 'denken an', 'Akkusativ', 'thing', 'What are you thinking about?', 'Before a vowel, add the linking r: woran and daran.', 40),
  ('___ denkst du?', 'An wen', 'Ich denke an meinen Bruder.', 'denken an', 'Akkusativ', 'person', 'Who are you thinking about?', 'For a person, use the preposition plus wen.', 50),
  ('___ sprecht ihr?', 'Worüber', 'Darüber sprechen wir.', 'sprechen über', 'Akkusativ', 'thing', 'What are you talking about?', 'Before a vowel, add the linking r: worüber and darüber.', 60),
  ('___ sprichst du?', 'Mit wem', 'Ich spreche mit meiner Lehrerin.', 'sprechen mit', 'Dativ', 'person', 'Who are you speaking with?', 'mit always takes the dative, so use wem.', 70),
  ('___ interessierst du dich?', 'Wofür', 'Dafür interessiere ich mich.', 'sich interessieren für', 'Akkusativ', 'thing', 'What are you interested in?', 'für takes the accusative: wofür and dafür.', 80),
  ('___ träumst du?', 'Wovon', 'Davon träume ich.', 'träumen von', 'Dativ', 'thing', 'What are you dreaming about?', 'von always takes the dative: wovon and davon.', 90),
  ('___ beschäftigst du dich?', 'Womit', 'Damit beschäftige ich mich.', 'sich beschäftigen mit', 'Dativ', 'thing', 'What are you working on?', 'mit always takes the dative: womit and damit.', 100),
  ('___ erinnerst du dich?', 'Woran', 'Daran erinnere ich mich.', 'sich erinnern an', 'Akkusativ', 'thing', 'What do you remember?', 'an takes the accusative in this construction.', 110),
  ('___ hängt der Erfolg ab?', 'Wovon', 'Davon hängt der Erfolg ab.', 'abhängen von', 'Dativ', 'thing', 'What does success depend on?', 'von always takes the dative: wovon and davon.', 120);

create trigger preposition_game_content_set_updated_at before update on public.preposition_game_content
for each row execute function public.set_updated_at();

alter table public.preposition_game_content enable row level security;
create policy "Anyone reads active preposition content" on public.preposition_game_content
for select to anon, authenticated using (active = true or exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins create preposition content" on public.preposition_game_content
for insert to authenticated with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins update preposition content" on public.preposition_game_content
for update to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins delete preposition content" on public.preposition_game_content
for delete to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
grant select on public.preposition_game_content to anon, authenticated;
grant insert, update, delete on public.preposition_game_content to authenticated;
