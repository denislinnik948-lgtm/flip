/**
 * Authors the locked 30-level campaign. Spec §9, §25, §28 step 5.
 *
 *   npm run generate:campaign
 *
 * Rerunning this with an unchanged generator produces a byte-identical file.
 * Rerunning it after a generator change will produce different puzzles — which
 * is precisely why the output is committed and guarded by a test: released
 * levels must not shift under players.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTENT_VERSION, CURATED_LEVEL_COUNT, buildCuratedLevels } from '../src/core/campaign';
import { DAILY_CONSTRAINTS } from '../src/core/config';
import { GENERATOR_VERSION, generatePuzzle } from '../src/core/generator';
import { hashString } from '../src/core/rng';
import { solve } from '../src/core/solver';

const CONTENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/content');
const OUT = resolve(CONTENT_DIR, 'campaign.v1.json');
const DAILY_FALLBACK_OUT = resolve(CONTENT_DIR, 'daily-fallback.v1.json');

const started = Date.now();
const levels = buildCuratedLevels();

// Never write content we have not re-verified end to end.
for (const level of levels) {
  const board = { size: level.gridSize, cells: level.initialState };
  const result = solve(board, level.cellTypes);
  if (!result.solvable) throw new Error(`Level ${level.id} is unsolvable`);
  if (result.optimalMoves !== level.optimalMoves) {
    throw new Error(
      `Level ${level.id} optimal mismatch: recorded ${level.optimalMoves}, measured ${result.optimalMoves}`,
    );
  }
}

writeFileSync(
  OUT,
  `${JSON.stringify({ generatorVersion: GENERATOR_VERSION, contentVersion: CONTENT_VERSION, levels }, null, 2)}\n`,
);

// Spec §27: the Daily needs a versioned puzzle to fall back on when generation
// fails, so that path stays deterministic instead of leaving players with no
// Daily at all.
const dailyFallback = generatePuzzle(hashString('FLIP_DAILY_FALLBACK'), DAILY_CONSTRAINTS);
if (!dailyFallback) throw new Error('Could not generate the Daily fallback puzzle');
writeFileSync(
  DAILY_FALLBACK_OUT,
  `${JSON.stringify(
    {
      generatorVersion: GENERATOR_VERSION,
      contentVersion: CONTENT_VERSION,
      puzzle: {
        gridSize: dailyFallback.gridSize,
        cellTypes: dailyFallback.cellTypes,
        initialState: dailyFallback.initialState,
        optimalMoves: dailyFallback.optimalMoves,
        difficulty: dailyFallback.difficulty,
        optimalSolution: dailyFallback.optimalSolution,
      },
    },
    null,
    2,
  )}\n`,
);

const bands = ['1-3 CROSS', '4-6 +ROW', '7-9 +COL'];
console.log(`Wrote ${levels.length} curated levels to ${OUT} in ${Date.now() - started}ms\n`);
for (let b = 0; b < bands.length; b++) {
  const detail = levels
    .slice(b * 3, b * 3 + 3)
    .map((l) => `${String(l.id).padStart(2, '0')}:${l.gridSize}×${l.gridSize}/${l.optimalMoves}`)
    .join('  ');
  console.log(`  ${bands[b].padEnd(10)} ${detail}`);
}
console.log(`\nLevels ${CURATED_LEVEL_COUNT + 1}+ are generated at runtime.`);
