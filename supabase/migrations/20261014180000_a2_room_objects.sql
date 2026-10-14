update public.practice_games
set levels = array['A1','A2'], updated_at = now()
where game_key = 'room_objects';

insert into public.room_object_content(
  level,room_key,room_title,article,noun,english_translation,image_url,
  battle_image_url,battle_crop_x,battle_crop_y,battle_crop_width,battle_crop_height,
  hotspot_x,hotspot_y,hotspot_width,hotspot_height,sort_order
) values
('A2','living_room','Living Room','der','Vorhang','curtain','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',0,0,33.3333,33.3333,0,0,14,50,10),
('A2','living_room','Living Room','das','Kissen','cushion','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',33.3333,0,33.3333,33.3333,28,39,14,15,20),
('A2','living_room','Living Room','die','Decke','blanket','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',66.6667,0,33.3333,33.3333,61,43,12,25,30),
('A2','living_room','Living Room','das','Gemälde','painting','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',0,33.3333,33.3333,33.3333,41,10,18,22,40),
('A2','living_room','Living Room','die','Zimmerpflanze','houseplant','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',33.3333,33.3333,33.3333,33.3333,0,19,9,28,50),
('A2','living_room','Living Room','der','Blumentopf','flowerpot','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',66.6667,33.3333,33.3333,33.3333,85,43,7,11,60),
('A2','living_room','Living Room','der','Korb','basket','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',0,66.6667,33.3333,33.3333,74,52,7,10,70),
('A2','living_room','Living Room','die','Schale','bowl','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',33.3333,66.6667,33.3333,33.3333,44,58,7,8,80),
('A2','living_room','Living Room','das','Sideboard','sideboard','./images/rooms/living-room-a1.png','./images/objects/living-room-a2-atlas.png',66.6667,66.6667,33.3333,33.3333,82,49,18,25,90),
('A2','kitchen','Kitchen','die','Dunstabzugshaube','extractor hood','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',0,0,25,33.3333,27,0,16,38,110),
('A2','kitchen','Kitchen','das','Kochfeld','cooktop','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',25,0,25,33.3333,26,39,16,8,120),
('A2','kitchen','Kitchen','der','Wasserhahn','faucet','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',50,0,25,33.3333,82,33,8,17,130),
('A2','kitchen','Kitchen','die','Arbeitsplatte','worktop','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',75,0,25,33.3333,42,43,16,7,140),
('A2','kitchen','Kitchen','das','Schneidebrett','chopping board','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',0,33.3333,25,33.3333,45,35,6,11,150),
('A2','kitchen','Kitchen','die','Obstschale','fruit bowl','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',25,33.3333,25,33.3333,16,39,9,8,160),
('A2','kitchen','Kitchen','der','Kochlöffel','cooking spoon','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',50,33.3333,25,33.3333,68,36,5,10,170),
('A2','kitchen','Kitchen','der','Kräutertopf','herb pot','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',75,33.3333,25,33.3333,52,37,8,11,180),
('A2','kitchen','Kitchen','der','Blumenstrauß','bouquet of flowers','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',0,66.6667,25,33.3333,61,39,10,22,190),
('A2','kitchen','Kitchen','die','Vase','vase','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',25,66.6667,25,33.3333,63,52,6,11,200),
('A2','kitchen','Kitchen','die','Schublade','drawer','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',50,66.6667,25,33.3333,18,49,20,12,210),
('A2','kitchen','Kitchen','die','Fliese','tile','./images/rooms/kitchen-a1.png','./images/objects/kitchen-a2-atlas.png',75,66.6667,25,33.3333,18,31,21,11,220)
on conflict (level,room_key,noun) do update set
  room_title=excluded.room_title,
  article=excluded.article,
  english_translation=excluded.english_translation,
  image_url=excluded.image_url,
  battle_image_url=excluded.battle_image_url,
  battle_crop_x=excluded.battle_crop_x,
  battle_crop_y=excluded.battle_crop_y,
  battle_crop_width=excluded.battle_crop_width,
  battle_crop_height=excluded.battle_crop_height,
  hotspot_x=excluded.hotspot_x,
  hotspot_y=excluded.hotspot_y,
  hotspot_width=excluded.hotspot_width,
  hotspot_height=excluded.hotspot_height,
  active=true,
  sort_order=excluded.sort_order;
