/**
 * Design tokens. Spec §21 — the supplied prototype is the visual source of truth.
 *
 * Values are transcribed verbatim from the prototype's "FINAL VISUAL TOKENS"
 * block (see design/prototype-unpacked.html). Do not tune them here by eye; if
 * a value needs to change, change it in the design and re-transcribe.
 */

/** Soft-contrast system, variant B — the prototype's default. */
export const colors = {
  bg: '#F7F7F5',
  surface: '#FBFBF9',
  /** Cell OFF fill. */
  off: '#E7E7E4',
  /** Cell ON fill. */
  on: '#2A2A29',
  text: '#2A2A29',
  textOnDark: '#F7F7F5',
  muted: '#8B8B85',
  mutedStrong: '#6E6E68',
  faint: '#B3B3AD',
  hairline: '#E4E4E0',
  /** Cell material separation. */
  offEdge: 'rgba(42,42,41,.055)',
  locked: '#EFEFEC',
  lockedText: '#BFBFB9',
  starOff: '#DCDCD6',
  outerBg: '#EDEDE9',
} as const;

/** Symbols are secondary information, so they sit at low contrast until previewed. */
export const symbolColors = {
  idleOff: 'rgba(42,42,41,.22)',
  idleOn: 'rgba(247,247,245,.24)',
  previewOff: 'rgba(42,42,41,.50)',
  previewOn: 'rgba(247,247,245,.58)',
} as const;

/** Preview ring adapts per cell, because it has to read on both fills. */
export const preview = {
  ringOff: 'rgba(42,42,41,.40)',
  ringOn: 'rgba(247,247,245,.52)',
  ringWidth: 1.5,
  /** Connector between adjacent previewed cells. */
  lineGap: 'rgba(42,42,41,.28)',
  scaleAffected: 1.015,
  scalePressed: 1.03,
} as const;

export const radius = {
  cell: 12,
  card: 14,
  sheet: 18,
  button: 13,
} as const;

export const layout = {
  gridGap: 10,
  pagePadding: 24,
  /** Board is 82% of width, capped — keeps 5×5 comfortable on small phones. */
  boardWidthRatio: 0.82,
  boardMaxWidth: 352,
  screenMaxWidth: 430,
  touchTarget: 44,
} as const;

/**
 * System sans: SF Pro on Apple, Roboto on Android. Weights 400/500/600 only.
 * Tracking is expressed in px here because React Native has no `em` — values
 * are the prototype's `em` figures multiplied by their font size.
 */
export const type = {
  display: { fontSize: 34, fontWeight: '500', letterSpacing: -0.68 },
  displayLarge: { fontSize: 44, fontWeight: '500', letterSpacing: -0.88 },
  result: { fontSize: 28, fontWeight: '500', letterSpacing: -0.28 },
  /** Uppercase section labels. */
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.54 },
  labelWide: { fontSize: 11, fontWeight: '600', letterSpacing: 1.76 },
  /** Small uppercase metadata. */
  meta: { fontSize: 10, fontWeight: '400', letterSpacing: 1.2 },
  metaWide: { fontSize: 10, fontWeight: '400', letterSpacing: 1.4 },
  button: { fontSize: 12, fontWeight: '600', letterSpacing: 2.16 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 24 },
  cellSymbol: { fontSize: 16, fontWeight: '400' },
} as const;

export const motion = {
  /** rotateY 180° on flip. */
  flipDuration: 220,
  /** Per manhattan step from the tapped cell. */
  flipStagger: 14,
  fast: 140,
  sheet: 300,
  sheetRise: 14,
  /** Home background ticker, one tile at a time. */
  homeTicker: 2200,
} as const;

/** cubic-bezier(.2,.8,.25,1) — the prototype's single easing curve. */
export const EASING = { x1: 0.2, y1: 0.8, x2: 0.25, y2: 1 } as const;
