/**
 * Spec §26 — gameplay.
 *
 * v1 has no HINT button, but the engine still exposes the optimal next move
 * (that is what v2's hint will highlight). The tests below use it to assert the
 * stronger invariant: every reachable position stays optimally solvable.
 */

import { describe, expect, it } from 'vitest';

import { MOVE_LIMIT_MULTIPLIER, moveLimitFor } from '../src/core/config';
import { GameEngine } from '../src/core/engine';
import { levelFor } from '../src/core/levels';
import type { LevelData } from '../src/core/types';

const LEVEL: LevelData = levelFor(17); // a generated level, all three mechanics
const CELL_COUNT = LEVEL.gridSize ** 2;

function solved(engine: GameEngine): GameEngine {
  for (const i of engine.level.optimalSolution) engine.tap(i);
  return engine;
}

describe('move counting (spec §6)', () => {
  it('starts at zero', () => {
    expect(new GameEngine(LEVEL).moves).toBe(0);
  });

  it('counts every executed action', () => {
    const engine = new GameEngine(LEVEL);
    engine.tap(0);
    engine.tap(5);
    engine.tap(0);
    expect(engine.moves).toBe(3);
  });

  it('does not count taps once the puzzle is solved', () => {
    const engine = solved(new GameEngine(LEVEL));
    const atFinish = engine.moves;
    expect(engine.tap(0)).toBe(false);
    expect(engine.moves).toBe(atFinish);
    expect(engine.solved).toBe(true);
  });

  it('ignores out-of-range taps without counting a move', () => {
    const engine = new GameEngine(LEVEL);
    expect(engine.tap(-1)).toBe(false);
    expect(engine.tap(CELL_COUNT)).toBe(false);
    expect(engine.tap(1.5)).toBe(false);
    expect(engine.moves).toBe(0);
  });
});

describe('preview (spec §6)', () => {
  it('reports the affected cells without changing the board', () => {
    const engine = new GameEngine(LEVEL);
    const before = [...engine.board.cells];
    const preview = engine.preview(5);
    expect(preview.length).toBeGreaterThan(0);
    expect(engine.board.cells).toEqual(before);
    expect(engine.moves).toBe(0);
  });

  it('predicts exactly what a tap will change', () => {
    const engine = new GameEngine(LEVEL);
    const before = [...engine.board.cells];
    const preview = engine.preview(9);
    engine.tap(9);
    const changed = engine.board.cells
      .map((c, i) => (c === before[i] ? -1 : i))
      .filter((i) => i >= 0);
    expect(changed).toEqual(preview);
  });
});

describe('solving', () => {
  it('the level\'s recorded optimal solution wins in optimal moves', () => {
    const engine = solved(new GameEngine(LEVEL));
    expect(engine.solved).toBe(true);
    expect(engine.moves).toBe(LEVEL.optimalMoves);
  });

  it('a self-inverse pair costs moves but changes nothing (spec §5)', () => {
    const engine = new GameEngine(LEVEL);
    const before = [...engine.board.cells];
    engine.tap(3);
    engine.tap(3);
    expect(engine.board.cells).toEqual(before);
    expect(engine.moves).toBe(2);
  });
});

describe('restart (spec §6)', () => {
  it('restores the original board and resets the move count', () => {
    const engine = new GameEngine(LEVEL);
    engine.tap(1);
    engine.tap(7);
    engine.restart();
    expect(engine.board.cells).toEqual([...LEVEL.initialState]);
    expect(engine.moves).toBe(0);
  });

  it('works after the puzzle was solved', () => {
    const engine = solved(new GameEngine(LEVEL));
    engine.restart();
    expect(engine.solved).toBe(false);
    expect(engine.tap(0)).toBe(true);
  });
});

describe('move limit — the only loss state (owner decision, 2026-09-09)', () => {
  it('is optimal x4', () => {
    const engine = new GameEngine(LEVEL);
    expect(engine.moveLimit).toBe(LEVEL.optimalMoves * MOVE_LIMIT_MULTIPLIER);
    expect(moveLimitFor(5)).toBe(20);
  });

  it('starts neither solved nor failed', () => {
    const engine = new GameEngine(LEVEL);
    expect(engine.failed).toBe(false);
    expect(engine.finished).toBe(false);
    expect(engine.movesRemaining).toBe(engine.moveLimit);
  });

  it('counts down as moves are spent', () => {
    const engine = new GameEngine(LEVEL);
    engine.tap(0);
    engine.tap(0);
    expect(engine.movesRemaining).toBe(engine.moveLimit - 2);
  });

  it('fails on the move that reaches the limit', () => {
    const engine = new GameEngine(LEVEL);
    // Tapping the same cell twice is a no-op pair, so the board never solves.
    for (let i = 0; i < engine.moveLimit; i++) engine.tap(i % 2);
    expect(engine.moves).toBe(engine.moveLimit);
    expect(engine.failed).toBe(true);
    expect(engine.solved).toBe(false);
    expect(engine.movesRemaining).toBe(0);
  });

  it('accepts no further taps once failed', () => {
    const engine = new GameEngine(LEVEL);
    for (let i = 0; i < engine.moveLimit; i++) engine.tap(i % 2);
    expect(engine.tap(3)).toBe(false);
    expect(engine.moves).toBe(engine.moveLimit);
  });

  it('never fails a player who solves it, even on the very last move', () => {
    // Spare budget is limit - optimal = 3 x optimal, so it only divides into
    // cancelling pairs when optimal is even. Level 8 is the even-optimal case.
    const level = levelFor(8);
    expect(level.optimalMoves % 2).toBe(0);

    const engine = new GameEngine(level);
    const spare = engine.moveLimit - level.optimalMoves;
    for (let i = 0; i < spare; i++) engine.tap(0);
    expect(engine.failed).toBe(false);

    for (const i of level.optimalSolution) engine.tap(i);
    expect(engine.moves).toBe(engine.moveLimit);
    expect(engine.solved).toBe(true);
    expect(engine.failed).toBe(false);
    expect(engine.finished).toBe(true);
  });

  it('restart clears the failure and gives the full budget back', () => {
    const engine = new GameEngine(LEVEL);
    for (let i = 0; i < engine.moveLimit; i++) engine.tap(i % 2);
    expect(engine.failed).toBe(true);

    engine.restart();
    expect(engine.failed).toBe(false);
    expect(engine.finished).toBe(false);
    expect(engine.movesRemaining).toBe(engine.moveLimit);
    expect(engine.tap(0)).toBe(true);
  });

  it('always leaves room for the optimal solution, on every level', () => {
    // The limit must never make a level unwinnable.
    for (const id of [1, 5, 9, 10, 25, 60]) {
      const level = levelFor(id);
      expect(moveLimitFor(level.optimalMoves)).toBeGreaterThanOrEqual(level.optimalMoves);
    }
  });
});

describe('optimalNextMove never mutates the board', () => {
  it('inspects without playing the move', () => {
    const engine = new GameEngine(LEVEL);
    const before = [...engine.board.cells];
    expect(engine.optimalNextMove()).not.toBeNull();
    expect(engine.board.cells).toEqual(before);
    expect(engine.moves).toBe(0);
  });

  it('returns null on an already-solved board', () => {
    expect(solved(new GameEngine(LEVEL)).optimalNextMove()).toBeNull();
  });
});

describe('the optimal next move keeps the player on a shortest path', () => {
  it('taking it always reduces the remaining optimum by exactly one', () => {
    // This is the precise definition of "part of an optimal solution".
    for (const id of [1, 5, 9, 14, 20, 26, 30]) {
      const engine = new GameEngine(levelFor(id));
      let guard = 0;

      while (!engine.solved && guard++ < 40) {
        const before = engine.remainingOptimalMoves();
        const next = engine.optimalNextMove();
        expect(next).not.toBeNull();
        engine.tap(next!);
        expect(engine.remainingOptimalMoves()).toBe(before - 1);
      }

      expect(engine.solved).toBe(true);
      expect(engine.moves).toBe(engine.level.optimalMoves);
    }
  });

  it('stays optimal even from a position the player wandered into', () => {
    const engine = new GameEngine(levelFor(23));
    engine.tap(4);
    engine.tap(11);
    engine.tap(0);

    let guard = 0;
    const target = engine.remainingOptimalMoves();
    while (!engine.solved && guard++ < 40) {
      engine.tap(engine.optimalNextMove()!);
    }
    expect(engine.solved).toBe(true);
    expect(engine.moves).toBe(3 + target);
  });
});
