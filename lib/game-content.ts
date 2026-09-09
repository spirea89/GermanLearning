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
  present_forms: string[];
  present_endings: string[];
  preterite_forms: string[];
  preterite_endings: string[];
  perfect_auxiliary: 'haben' | 'sein';
  participle: string;
  participle_ending: string;
  active: boolean;
  sort_order: number;
};

export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
export const AUXILIARY_FORMS = {
  haben: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
  sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
};

export const FALLBACK_VERBS: VerbGameItem[] = [
  { id: 'verb-1', level: 'B1', infinitive: 'lernen', present_forms: ['lerne','lernst','lernt','lernen','lernt','lernen'], present_endings: ['e','st','t','en','t','en'], preterite_forms: ['lernte','lerntest','lernte','lernten','lerntet','lernten'], preterite_endings: ['te','test','te','ten','tet','ten'], perfect_auxiliary: 'haben', participle: 'gelernt', participle_ending: 't', active: true, sort_order: 10 },
  { id: 'verb-2', level: 'B1', infinitive: 'fahren', present_forms: ['fahre','fährst','fährt','fahren','fahrt','fahren'], present_endings: ['e','st','t','en','t','en'], preterite_forms: ['fuhr','fuhrst','fuhr','fuhren','fuhrt','fuhren'], preterite_endings: ['','st','','en','t','en'], perfect_auxiliary: 'sein', participle: 'gefahren', participle_ending: 'en', active: true, sort_order: 20 },
];

export const FALLBACK_GAME_ITEMS: GameItem[] = [
  { id: 'demo-1', level: 'B1', game_key: 'opposites', phrase_before: 'Den Fahrstuhl ', target_word: 'betreten', phrase_after: '', opposite_word: 'verlassen', hint: 'Man geht hinaus.', active: true, sort_order: 10 },
  { id: 'demo-2', level: 'B1', game_key: 'opposites', phrase_before: 'Die Tür ', target_word: 'öffnen', phrase_after: '', opposite_word: 'schließen', hint: 'Danach ist sie nicht mehr offen.', active: true, sort_order: 20 },
  { id: 'demo-3', level: 'B1', game_key: 'opposites', phrase_before: 'Das Licht ', target_word: 'einschalten', phrase_after: '', opposite_word: 'ausschalten', hint: 'Danach ist es dunkel.', active: true, sort_order: 30 },
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

export function validateVerbItem(item: Pick<VerbGameItem, 'infinitive' | 'present_forms' | 'present_endings' | 'preterite_forms' | 'preterite_endings' | 'participle' | 'participle_ending'>) {
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
  if (!item.participle.trim()) problems.push('Participle is required.');
  else if (item.participle_ending && !item.participle.endsWith(item.participle_ending)) problems.push(`Participle “${item.participle}” does not end in “${item.participle_ending}”.`);
  return problems;
}

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase('de-DE').normalize('NFC');
}
