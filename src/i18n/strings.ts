/**
 * UI copy, English and Ukrainian.
 *
 * Every user-facing string lives here — no literals in components. The board
 * itself carries no language, so this is the whole surface.
 *
 * Two constraints shape the wording:
 *
 * 1. Labels are set in caps with wide letter-spacing (spec §21), so Ukrainian
 *    has to be *short*. "НАСТУПНИЙ РІВЕНЬ" would overflow a 56pt button at that
 *    tracking, so buttons use the punchier form ("ДАЛІ") the way a native app
 *    would, rather than a literal translation.
 * 2. The word "puzzle" is banned from the interface (owner, 2026-09-09),
 *    including the About copy.
 */

import type { CellType } from '../core/types';

export type Language = 'en' | 'uk';

export const LANGUAGES: readonly Language[] = ['en', 'uk'];

/** Shown on the language row itself — always in its own language. */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  uk: 'Українська',
};

interface Copy {
  readonly play: string;
  readonly levels: string;
  readonly settings: string;
  readonly dailyFlip: string;
  readonly todaysChallenge: string;
  readonly restart: string;
  readonly tryAgain: string;
  readonly home: string;
  readonly next: string;
  readonly complete: string;
  readonly newBest: string;
  readonly best: string;
  readonly outOfMoves: string;
  readonly moveLimit: string;
  readonly dailyComplete: string;
  readonly comeBackTomorrow: string;
  readonly haptics: string;
  readonly language: string;
  readonly on: string;
  readonly off: string;
  readonly aboutFlip: string;
  readonly aboutLine: string;
  readonly version: string;
  readonly privacyPolicy: string;
  readonly terms: string;
  readonly back: string;
  readonly locked: string;
  readonly completed: string;
  readonly cellTypes: Record<CellType, string>;
  readonly cellOn: string;
  readonly cellOff: string;
  /** "3 MOVES" — the unit shown beside a count. */
  moves(n: number): string;
  /** "LEVEL 07" */
  level(n: number): string;
  /** Just the pluralised unit, for when the count is rendered separately. */
  movesUnit(n: number): string;
  /** Reads after movesUnit: "3 / MOVES TO SOLVE". */
  toSolve: string;
  readonly yourBest: string;
  /** The provable floor for a level — nobody can beat it. */
  readonly bestPossible: string;
  readonly perfect: string;
}

/**
 * Ukrainian has three plural forms; picking the wrong one is the loudest tell
 * of a machine translation, so the rule is implemented properly rather than
 * approximated with a simple n === 1 check.
 */
function ukPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const EN: Copy = {
  play: 'PLAY',
  levels: 'LEVELS',
  settings: 'SETTINGS',
  dailyFlip: 'DAILY FLIP',
  todaysChallenge: "TODAY'S CHALLENGE",
  restart: 'RESTART',
  tryAgain: 'TRY AGAIN',
  home: 'HOME',
  next: 'NEXT LEVEL',
  complete: 'COMPLETE',
  newBest: 'NEW BEST',
  best: 'BEST',
  outOfMoves: 'OUT OF MOVES',
  moveLimit: 'MOVE LIMIT',
  dailyComplete: 'DAILY COMPLETE',
  comeBackTomorrow: 'COME BACK TOMORROW',
  haptics: 'Haptics',
  language: 'Language',
  on: 'ON',
  off: 'OFF',
  aboutFlip: 'About Flip Field',
  aboutLine: 'A simple game about\none move at a time.',
  version: 'VERSION',
  privacyPolicy: 'Privacy Policy',
  terms: 'Terms',
  back: 'Back',
  locked: 'locked',
  completed: 'completed',
  cellTypes: { cross: 'cross', row: 'row', col: 'column' },
  cellOn: 'on',
  cellOff: 'off',
  moves: (n) => `${n} ${n === 1 ? 'MOVE' : 'MOVES'}`,
  level: (n) => `LEVEL ${String(n).padStart(2, '0')}`,
  movesUnit: (n) => (n === 1 ? 'MOVE' : 'MOVES'),
  toSolve: 'TO SOLVE',
  yourBest: 'YOUR BEST',
  bestPossible: 'BEST POSSIBLE',
  perfect: 'PERFECT',
};

const UK: Copy = {
  play: 'ГРАТИ',
  levels: 'РІВНІ',
  settings: 'НАЛАШТУВАННЯ',
  dailyFlip: 'ЩОДЕННИЙ FLIP',
  todaysChallenge: 'ВИКЛИК ДНЯ',
  restart: 'ЗАНОВО',
  tryAgain: 'ЩЕ РАЗ',
  home: 'ГОЛОВНА',
  next: 'ДАЛІ',
  complete: 'ПРОЙДЕНО',
  newBest: 'НОВИЙ РЕКОРД',
  best: 'РЕКОРД',
  outOfMoves: 'ХОДИ ЗАКІНЧИЛИСЬ',
  moveLimit: 'ЛІМІТ ХОДІВ',
  dailyComplete: 'ЩОДЕННИЙ ПРОЙДЕНО',
  comeBackTomorrow: 'ПОВЕРТАЙТЕСЬ ЗАВТРА',
  haptics: 'Вібрація',
  language: 'Мова',
  on: 'УВІМК',
  off: 'ВИМК',
  aboutFlip: 'Про Flip Field',
  aboutLine: 'Проста гра\nпро один хід за раз.',
  version: 'ВЕРСІЯ',
  privacyPolicy: 'Політика конфіденційності',
  terms: 'Умови',
  back: 'Назад',
  locked: 'заблоковано',
  completed: 'пройдено',
  cellTypes: { cross: 'хрест', row: 'рядок', col: 'стовпець' },
  cellOn: 'увімкнена',
  cellOff: 'вимкнена',
  moves: (n) => `${n} ${ukPlural(n, 'ХІД', 'ХОДИ', 'ХОДІВ')}`,
  level: (n) => `РІВЕНЬ ${String(n).padStart(2, '0')}`,
  movesUnit: (n) => ukPlural(n, 'ХІД', 'ХОДИ', 'ХОДІВ'),
  toSolve: 'ДО РОЗВ\u2019ЯЗКУ',
  yourBest: 'ВАШ РЕКОРД',
  bestPossible: 'ІДЕАЛ',
  perfect: 'ІДЕАЛЬНО',
};

export const COPY: Record<Language, Copy> = { en: EN, uk: UK };

export type { Copy };
