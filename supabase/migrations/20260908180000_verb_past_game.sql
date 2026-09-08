create table public.verb_game_content (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'B1' check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  infinitive text not null unique check (char_length(infinitive) between 1 and 80),
  present_forms text[] not null check (cardinality(present_forms) = 6),
  present_endings text[] not null check (cardinality(present_endings) = 6),
  preterite_forms text[] not null check (cardinality(preterite_forms) = 6),
  preterite_endings text[] not null check (cardinality(preterite_endings) = 6),
  perfect_auxiliary text not null check (perfect_auxiliary in ('haben', 'sein')),
  participle text not null,
  participle_ending text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.verb_game_content (infinitive, present_forms, present_endings, preterite_forms, preterite_endings, perfect_auxiliary, participle, participle_ending, sort_order)
values
  ('lernen', array['lerne','lernst','lernt','lernen','lernt','lernen'], array['e','st','t','en','t','en'], array['lernte','lerntest','lernte','lernten','lerntet','lernten'], array['te','test','te','ten','tet','ten'], 'haben', 'gelernt', 't', 10),
  ('fahren', array['fahre','fährst','fährt','fahren','fahrt','fahren'], array['e','st','t','en','t','en'], array['fuhr','fuhrst','fuhr','fuhren','fuhrt','fuhren'], array['','st','','en','t','en'], 'sein', 'gefahren', 'en', 20);

create trigger verb_game_content_set_updated_at before update on public.verb_game_content
for each row execute function public.set_updated_at();

alter table public.verb_game_content enable row level security;
create policy "Anyone reads active verb content" on public.verb_game_content
for select to anon, authenticated using (active = true or exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins create verb content" on public.verb_game_content
for insert to authenticated with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins update verb content" on public.verb_game_content
for update to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins delete verb content" on public.verb_game_content
for delete to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
grant select on public.verb_game_content to anon, authenticated;
grant insert, update, delete on public.verb_game_content to authenticated;
