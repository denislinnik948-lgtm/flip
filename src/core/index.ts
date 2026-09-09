/**
 * Public surface of the FLIP core (spec §24).
 *
 * The presentation layer should import from here only. Nothing below this
 * barrel touches a DOM, React Native or Node API, so the whole core stays
 * testable headless.
 */

export * from './types';
export * from './board';
export * from './actions';
export * from './solver';
export * from './generator';
export * from './engine';
export * from './progress';
// hints.ts is intentionally NOT exported: the hint economy ships in v2 with
// ads and IAP (owner decision, 2026-09-08). The module and its tests are kept
// so the design is not lost.
export * from './levels';
export * from './daily';
export { CURATED_LEVEL_COUNT, CONTENT_VERSION, levelSpec } from './campaign';
export { MOVE_LIMIT_MULTIPLIER, moveLimitFor } from './config';
export { createRng, hashString, type Rng } from './rng';
