alter table public.verb_game_content
  add column present_sentences text[] not null default array[]::text[],
  add column preterite_sentences text[] not null default array[]::text[],
  add column perfect_sentences text[] not null default array[]::text[],
  add column sentence_translations text[] not null default array[]::text[];

update public.verb_game_content set
  present_sentences = array['Ich lerne jeden Abend Deutsch.','Du lernst neue Wörter.','Er lernt für die Prüfung.','Wir lernen zusammen.','Ihr lernt sehr schnell.','Sie lernen in der Bibliothek.'],
  preterite_sentences = array['Ich lernte jeden Abend Deutsch.','Du lerntest neue Wörter.','Er lernte für die Prüfung.','Wir lernten zusammen.','Ihr lerntet sehr schnell.','Sie lernten in der Bibliothek.'],
  perfect_sentences = array['Ich habe jeden Abend Deutsch gelernt.','Du hast neue Wörter gelernt.','Er hat für die Prüfung gelernt.','Wir haben zusammen gelernt.','Ihr habt sehr schnell gelernt.','Sie haben in der Bibliothek gelernt.'],
  sentence_translations = array['I study German every evening.','You learn new words.','He studies for the exam.','We learn together.','You learn very quickly.','They study in the library.']
where infinitive = 'lernen';

update public.verb_game_content set
  present_sentences = array['Ich fahre mit dem Zug nach Wien.','Du fährst jeden Morgen zur Arbeit.','Sie fährt am Wochenende ans Meer.','Wir fahren gemeinsam nach Hause.','Ihr fahrt mit dem Bus.','Sie fahren im Sommer nach Berlin.'],
  preterite_sentences = array['Ich fuhr mit dem Zug nach Wien.','Du fuhrst jeden Morgen zur Arbeit.','Sie fuhr am Wochenende ans Meer.','Wir fuhren gemeinsam nach Hause.','Ihr fuhrt mit dem Bus.','Sie fuhren im Sommer nach Berlin.'],
  perfect_sentences = array['Ich bin mit dem Zug nach Wien gefahren.','Du bist jeden Morgen zur Arbeit gefahren.','Sie ist am Wochenende ans Meer gefahren.','Wir sind gemeinsam nach Hause gefahren.','Ihr seid mit dem Bus gefahren.','Sie sind im Sommer nach Berlin gefahren.'],
  sentence_translations = array['I travel to Vienna by train.','You drive to work every morning.','She travels to the sea on the weekend.','We travel home together.','You travel by bus.','They travel to Berlin in summer.']
where infinitive = 'fahren';

alter table public.verb_game_content
  add constraint verb_sentence_sets_complete check (
    (cardinality(present_sentences) = 0 and cardinality(preterite_sentences) = 0 and cardinality(perfect_sentences) = 0 and cardinality(sentence_translations) = 0)
    or
    (cardinality(present_sentences) = 6 and cardinality(preterite_sentences) = 6 and cardinality(perfect_sentences) = 6 and cardinality(sentence_translations) = 6)
  );
