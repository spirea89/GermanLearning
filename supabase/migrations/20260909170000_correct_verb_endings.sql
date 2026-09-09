update public.verb_game_content
set present_endings = array['e','st','t','n','t','n']
where infinitive in ('sammeln', 'klingeln', 'lächeln', 'wandern', 'ändern', 'feiern', 'verändern', 'verbessern');

update public.verb_game_content
set present_endings = array['','t','','en','t','en']
where infinitive = 'wissen';

update public.verb_game_content
set present_endings[3] = ''
where infinitive = 'werden';

update public.verb_game_content
set present_endings = array['e','st','t','n','t','n']
where infinitive = 'tun';
