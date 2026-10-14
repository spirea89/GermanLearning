create table public.room_object_content (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1','C2')),
  room_key text not null check (room_key ~ '^[a-z0-9_-]+$'),
  room_title text not null check (char_length(trim(room_title)) between 1 and 80),
  article text not null check (article in ('der','die','das')),
  noun text not null check (char_length(trim(noun)) between 1 and 80),
  english_translation text not null check (char_length(trim(english_translation)) between 1 and 120),
  image_url text not null,
  hotspot_x numeric not null check (hotspot_x between 0 and 100),
  hotspot_y numeric not null check (hotspot_y between 0 and 100),
  hotspot_width numeric not null check (hotspot_width > 0 and hotspot_x + hotspot_width <= 100),
  hotspot_height numeric not null check (hotspot_height > 0 and hotspot_y + hotspot_height <= 100),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(level, room_key, noun)
);

create trigger room_object_content_set_updated_at before update on public.room_object_content
for each row execute function public.set_updated_at();

alter table public.room_object_content enable row level security;
create policy "Anyone reads active room objects" on public.room_object_content
for select to anon, authenticated using (active or exists (select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins create room objects" on public.room_object_content
for insert to authenticated with check (exists (select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins update room objects" on public.room_object_content
for update to authenticated using (exists (select 1 from public.app_admins where user_id=(select auth.uid()))) with check (exists (select 1 from public.app_admins where user_id=(select auth.uid())));
create policy "Admins delete room objects" on public.room_object_content
for delete to authenticated using (exists (select 1 from public.app_admins where user_id=(select auth.uid())));
grant select on public.room_object_content to anon,authenticated;
grant insert,update,delete on public.room_object_content to authenticated;

insert into public.practice_games(game_key,title,category,levels,active,sort_order)
values('room_objects','Was ist das?','Visual vocabulary',array['A1'],true,40)
on conflict(game_key) do update set title=excluded.title,category=excluded.category,levels=excluded.levels,active=true;

insert into public.room_object_content(level,room_key,room_title,article,noun,english_translation,image_url,hotspot_x,hotspot_y,hotspot_width,hotspot_height,sort_order) values
('A1','living_room','Living Room','das','Sofa','sofa','./images/rooms/living-room-a1.png',25,38,45,29,10),
('A1','living_room','Living Room','der','Sessel','armchair','./images/rooms/living-room-a1.png',0,44,21,34,20),
('A1','living_room','Living Room','die','Lampe','lamp','./images/rooms/living-room-a1.png',19,21,9,47,30),
('A1','living_room','Living Room','der','Fernseher','television','./images/rooms/living-room-a1.png',84,26,16,36,40),
('A1','living_room','Living Room','das','Bücherregal','bookshelf','./images/rooms/living-room-a1.png',69,7,13,55,50),
('A1','living_room','Living Room','der','Tisch','table','./images/rooms/living-room-a1.png',37,58,26,25,60),
('A1','living_room','Living Room','der','Teppich','rug','./images/rooms/living-room-a1.png',7,67,85,27,70),
('A1','living_room','Living Room','das','Fenster','window','./images/rooms/living-room-a1.png',3,2,17,45,80),
('A1','living_room','Living Room','die','Uhr','clock','./images/rooms/living-room-a1.png',88,4,7,18,90),
('A1','kitchen','Kitchen','der','Kühlschrank','refrigerator','./images/rooms/kitchen-a1.png',0,0,17,92,110),
('A1','kitchen','Kitchen','der','Ofen','oven','./images/rooms/kitchen-a1.png',31,46,11,28,120),
('A1','kitchen','Kitchen','das','Spülbecken','sink','./images/rooms/kitchen-a1.png',72,39,17,21,130),
('A1','kitchen','Kitchen','der','Tisch','table','./images/rooms/kitchen-a1.png',38,52,54,45,140),
('A1','kitchen','Kitchen','der','Stuhl','chair','./images/rooms/kitchen-a1.png',42,62,18,37,150),
('A1','kitchen','Kitchen','die','Lampe','lamp','./images/rooms/kitchen-a1.png',60,0,14,27,160),
('A1','kitchen','Kitchen','der','Wasserkocher','kettle','./images/rooms/kitchen-a1.png',39,37,6,12,170),
('A1','kitchen','Kitchen','der','Toaster','toaster','./images/rooms/kitchen-a1.png',45,39,6,10,180),
('A1','kitchen','Kitchen','die','Tasse','cup','./images/rooms/kitchen-a1.png',67,54,6,12,190),
('A1','kitchen','Kitchen','der','Teller','plate','./images/rooms/kitchen-a1.png',55,58,10,6,200),
('A1','kitchen','Kitchen','der','Schrank','cupboard','./images/rooms/kitchen-a1.png',17,0,52,35,210),
('A1','kitchen','Kitchen','das','Fenster','window','./images/rooms/kitchen-a1.png',76,0,19,40,220);
