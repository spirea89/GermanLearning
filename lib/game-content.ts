export type GameItem = {
  id: string;
  level: string;
  game_key: 'opposites';
  phrase_before: string;
  target_word: string;
  phrase_after: string;
  opposite_word: string;
  hint: string | null;
  active: boolean;
  sort_order: number;
};

export type VerbGameItem = {
  id: string;
  level: string;
  infinitive: string;
  english_translation: string;
  present_forms: string[];
  present_endings: string[];
  preterite_forms: string[];
  preterite_endings: string[];
  perfect_auxiliary: 'haben' | 'sein';
  participle: string;
  participle_ending: string;
  present_sentences: string[];
  preterite_sentences: string[];
  perfect_sentences: string[];
  sentence_translations: string[];
  active: boolean;
  sort_order: number;
};

export type PrepositionGameItem = {
  id: string;
  level: string;
  prompt: string;
  correct_answer: string;
  response_example: string;
  construction: string;
  grammatical_case: 'Akkusativ' | 'Dativ' | 'Genitiv';
  reference_type: 'thing' | 'person';
  english_translation: string;
  explanation: string;
  active: boolean;
  sort_order: number;
};

export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
export const AUXILIARY_FORMS = {
  haben: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
  sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
};

export const FALLBACK_VERBS: VerbGameItem[] = [
  { id: 'verb-1', level: 'B1', infinitive: 'lernen', english_translation: 'to learn', present_forms: ['lerne','lernst','lernt','lernen','lernt','lernen'], present_endings: ['e','st','t','en','t','en'], preterite_forms: ['lernte','lerntest','lernte','lernten','lerntet','lernten'], preterite_endings: ['te','test','te','ten','tet','ten'], perfect_auxiliary: 'haben', participle: 'gelernt', participle_ending: 't', present_sentences: ['Ich lerne jeden Abend Deutsch.','Du lernst neue Wörter.','Er lernt für die Prüfung.','Wir lernen zusammen.','Ihr lernt sehr schnell.','Sie lernen in der Bibliothek.'], preterite_sentences: ['Ich lernte jeden Abend Deutsch.','Du lerntest neue Wörter.','Er lernte für die Prüfung.','Wir lernten zusammen.','Ihr lerntet sehr schnell.','Sie lernten in der Bibliothek.'], perfect_sentences: ['Ich habe jeden Abend Deutsch gelernt.','Du hast neue Wörter gelernt.','Er hat für die Prüfung gelernt.','Wir haben zusammen gelernt.','Ihr habt sehr schnell gelernt.','Sie haben in der Bibliothek gelernt.'], sentence_translations: ['I study German every evening.','You learn new words.','He studies for the exam.','We learn together.','You learn very quickly.','They study in the library.'], active: true, sort_order: 10 },
  { id: 'verb-2', level: 'B1', infinitive: 'fahren', english_translation: 'to drive; to travel', present_forms: ['fahre','fährst','fährt','fahren','fahrt','fahren'], present_endings: ['e','st','t','en','t','en'], preterite_forms: ['fuhr','fuhrst','fuhr','fuhren','fuhrt','fuhren'], preterite_endings: ['','st','','en','t','en'], perfect_auxiliary: 'sein', participle: 'gefahren', participle_ending: 'en', present_sentences: ['Ich fahre mit dem Zug nach Wien.','Du fährst jeden Morgen zur Arbeit.','Sie fährt am Wochenende ans Meer.','Wir fahren gemeinsam nach Hause.','Ihr fahrt mit dem Bus.','Sie fahren im Sommer nach Berlin.'], preterite_sentences: ['Ich fuhr mit dem Zug nach Wien.','Du fuhrst jeden Morgen zur Arbeit.','Sie fuhr am Wochenende ans Meer.','Wir fuhren gemeinsam nach Hause.','Ihr fuhrt mit dem Bus.','Sie fuhren im Sommer nach Berlin.'], perfect_sentences: ['Ich bin mit dem Zug nach Wien gefahren.','Du bist jeden Morgen zur Arbeit gefahren.','Sie ist am Wochenende ans Meer gefahren.','Wir sind gemeinsam nach Hause gefahren.','Ihr seid mit dem Bus gefahren.','Sie sind im Sommer nach Berlin gefahren.'], sentence_translations: ['I travel to Vienna by train.','You drive to work every morning.','She travels to the sea on the weekend.','We travel home together.','You travel by bus.','They travel to Berlin in summer.'], active: true, sort_order: 20 },
];

export const FALLBACK_GAME_ITEMS: GameItem[] = [
  { id: 'demo-1', level: 'B1', game_key: 'opposites', phrase_before: 'Den Fahrstuhl ', target_word: 'betreten', phrase_after: '', opposite_word: 'verlassen', hint: 'Man geht hinaus.', active: true, sort_order: 10 },
  { id: 'demo-2', level: 'B1', game_key: 'opposites', phrase_before: 'Die Tür ', target_word: 'öffnen', phrase_after: '', opposite_word: 'schließen', hint: 'Danach ist sie nicht mehr offen.', active: true, sort_order: 20 },
  { id: 'demo-3', level: 'B1', game_key: 'opposites', phrase_before: 'Das Licht ', target_word: 'einschalten', phrase_after: '', opposite_word: 'ausschalten', hint: 'Danach ist es dunkel.', active: true, sort_order: 30 },
];

export const FALLBACK_PREPOSITIONS: PrepositionGameItem[] = [
  { id: 'prep-1', level: 'B1', prompt: '___ wartest du?', correct_answer: 'Worauf', response_example: 'Darauf warte ich.', construction: 'warten auf', grammatical_case: 'Akkusativ', reference_type: 'thing', english_translation: 'What are you waiting for?', explanation: 'For things, wo(r)- forms the question and da(r)- forms the answer.', active: true, sort_order: 10 },
  { id: 'prep-2', level: 'B1', prompt: '___ hast du Angst?', correct_answer: 'Wovor', response_example: 'Davor habe ich Angst.', construction: 'Angst haben vor', grammatical_case: 'Dativ', reference_type: 'thing', english_translation: 'What are you afraid of?', explanation: 'vor begins with a consonant, so use wo + vor and da + vor.', active: true, sort_order: 20 },
  { id: 'prep-3', level: 'B1', prompt: '___ denkst du?', correct_answer: 'Woran', response_example: 'Daran denke ich.', construction: 'denken an', grammatical_case: 'Akkusativ', reference_type: 'thing', english_translation: 'What are you thinking about?', explanation: 'Before a vowel, wo and da take a linking r: woran, daran.', active: true, sort_order: 30 },
  { id: 'prep-4', level: 'B1', prompt: '___ denkst du?', correct_answer: 'An wen', response_example: 'Ich denke an meinen Bruder.', construction: 'denken an', grammatical_case: 'Akkusativ', reference_type: 'person', english_translation: 'Who are you thinking about?', explanation: 'For people, use the preposition plus wen or wem.', active: true, sort_order: 40 },
  { id: 'prep-5', level: 'B1', prompt: '___ sprecht ihr?', correct_answer: 'Worüber', response_example: 'Darüber sprechen wir.', construction: 'sprechen über', grammatical_case: 'Akkusativ', reference_type: 'thing', english_translation: 'What are you talking about?', explanation: 'über begins with a vowel, so use worüber and darüber.', active: true, sort_order: 50 },
];

export function splitVerbForm(form: string, ending: string) {
  const [conjugated = '', ...rest] = form.trim().split(/\s+/);
  const validEnding = !ending || conjugated.endsWith(ending);
  return {
    stem: validEnding && ending ? conjugated.slice(0, -ending.length) : conjugated,
    ending: validEnding ? ending : '',
    remainder: rest.length ? ` ${rest.join(' ')}` : '',
  };
}

export function splitStemChange(stem: string, comparisonStem: string) {
  let prefixLength = 0;
  while (prefixLength < stem.length && prefixLength < comparisonStem.length && stem[prefixLength] === comparisonStem[prefixLength]) prefixLength += 1;
  let suffixLength = 0;
  while (suffixLength < stem.length - prefixLength && suffixLength < comparisonStem.length - prefixLength && stem[stem.length - 1 - suffixLength] === comparisonStem[comparisonStem.length - 1 - suffixLength]) suffixLength += 1;
  return {
    prefix: stem.slice(0, prefixLength),
    change: stem.slice(prefixLength, suffixLength ? -suffixLength : undefined),
    suffix: suffixLength ? stem.slice(-suffixLength) : '',
  };
}

export function validateVerbItem(item: Pick<VerbGameItem, 'infinitive' | 'english_translation' | 'present_forms' | 'present_endings' | 'preterite_forms' | 'preterite_endings' | 'participle' | 'participle_ending' | 'present_sentences' | 'preterite_sentences' | 'perfect_sentences' | 'sentence_translations'>) {
  const problems: string[] = [];
  const pronouns = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
  for (const [label, forms, endings] of [['Present', item.present_forms, item.present_endings], ['Präteritum', item.preterite_forms, item.preterite_endings]] as const) {
    if (forms.length !== 6 || endings.length !== 6) { problems.push(`${label} needs exactly six forms and six endings.`); continue; }
    forms.forEach((form, index) => {
      const conjugated = form.trim().split(/\s+/)[0] ?? '';
      const ending = endings[index];
      if (!conjugated) problems.push(`${label} (${pronouns[index]}) is empty.`);
      else if (ending && !conjugated.endsWith(ending)) problems.push(`${label} (${pronouns[index]}): “${conjugated}” does not end in “${ending}”.`);
    });
  }
  if (!item.infinitive.trim()) problems.push('Infinitive is required.');
  if (!item.english_translation.trim()) problems.push('English translation is required.');
  if (!item.participle.trim()) problems.push('Participle is required.');
  else if (item.participle_ending && !item.participle.endsWith(item.participle_ending)) problems.push(`Participle “${item.participle}” does not end in “${item.participle_ending}”.`);
  const sentenceGroups = [item.present_sentences, item.preterite_sentences, item.perfect_sentences, item.sentence_translations];
  const hasSentenceContent = sentenceGroups.some((group) => group.some((sentence) => sentence.trim()));
  if (hasSentenceContent && sentenceGroups.some((group) => group.length !== 6 || group.some((sentence) => !sentence.trim()))) problems.push('Context mode needs six complete present, Präteritum, Perfekt, and English sentences.');
  return problems;
}

export function hasSentenceContext(item: VerbGameItem) {
  return [item.present_sentences, item.preterite_sentences, item.perfect_sentences, item.sentence_translations].every((group) => group?.length === 6 && group.every((sentence) => sentence.trim()));
}

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase('de-DE').normalize('NFC');
}
