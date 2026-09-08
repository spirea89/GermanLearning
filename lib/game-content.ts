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

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase('de-DE').normalize('NFC');
}
