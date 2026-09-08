create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.app_admins (user_id)
select id from auth.users order by created_at asc limit 1
on conflict do nothing;

create table public.game_content (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  game_key text not null default 'opposites' check (game_key in ('opposites')),
  phrase_before text not null default '',
  target_word text not null check (char_length(target_word) between 1 and 80),
  phrase_after text not null default '',
  opposite_word text not null check (char_length(opposite_word) between 1 and 80),
  hint text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.game_content (level, phrase_before, target_word, phrase_after, opposite_word, hint, sort_order)
values
  ('B1', 'Den Fahrstuhl ', 'betreten', '', 'verlassen', 'Man geht hinaus.', 10),
  ('B1', 'Die Tür ', 'öffnen', '', 'schließen', 'Danach ist sie nicht mehr offen.', 20),
  ('B1', 'Das Licht ', 'einschalten', '', 'ausschalten', 'Danach ist es dunkel.', 30),
  ('B1', 'Die Geschwindigkeit ', 'erhöhen', '', 'verringern', 'Es wird weniger.', 40),
  ('B1', 'Eine Einladung ', 'annehmen', '', 'ablehnen', 'Man sagt Nein.', 50);

create trigger game_content_set_updated_at before update on public.game_content
for each row execute function public.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.game_content enable row level security;

create policy "Users see their own admin status" on public.app_admins
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Anyone reads active game content" on public.game_content
for select to anon, authenticated using (active = true or exists (select 1 from public.app_admins where user_id = (select auth.uid())));

create policy "Admins create game content" on public.game_content
for insert to authenticated with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins update game content" on public.game_content
for update to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.app_admins where user_id = (select auth.uid())));
create policy "Admins delete game content" on public.game_content
for delete to authenticated using (exists (select 1 from public.app_admins where user_id = (select auth.uid())));

grant select on public.app_admins to authenticated;
grant select on public.game_content to anon, authenticated;
grant insert, update, delete on public.game_content to authenticated;
