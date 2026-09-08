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

export const FALLBACK_GAME_ITEMS: GameItem[] = [
  { id: 'demo-1', level: 'B1', game_key: 'opposites', phrase_before: 'Den Fahrstuhl ', target_word: 'betreten', phrase_after: '', opposite_word: 'verlassen', hint: 'Man geht hinaus.', active: true, sort_order: 10 },
  { id: 'demo-2', level: 'B1', game_key: 'opposites', phrase_before: 'Die Tür ', target_word: 'öffnen', phrase_after: '', opposite_word: 'schließen', hint: 'Danach ist sie nicht mehr offen.', active: true, sort_order: 20 },
  { id: 'demo-3', level: 'B1', game_key: 'opposites', phrase_before: 'Das Licht ', target_word: 'einschalten', phrase_after: '', opposite_word: 'ausschalten', hint: 'Danach ist es dunkel.', active: true, sort_order: 30 },
];

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase('de-DE').normalize('NFC');
}
