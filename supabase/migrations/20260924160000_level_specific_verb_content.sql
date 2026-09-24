-- The same infinitive can be taught with different examples at multiple CEFR levels.
alter table public.verb_game_content
  drop constraint if exists verb_game_content_infinitive_key;

alter table public.verb_game_content
  add constraint verb_game_content_level_infinitive_key unique (level, infinitive);
