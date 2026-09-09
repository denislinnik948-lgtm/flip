# FLIP

Production implementation of FLIP, per `FLIP_DEVELOPMENT_SPEC.md` (product/logic
source of truth) and `FLIP Prototype (standalone).html` (visual source of truth).

Ships on the App Store as **Flip Field** — "FLIP" alone is taken by an existing
game, and App Store names are globally unique. The in-app wordmark stays FLIP:
it is four tiles spelling F-L-I-P, and the store name is a listing field, not
the brand.

Target platform: **React Native + Expo SDK 57** (iOS + Android, one codebase).

The SDK version is not incidental: Expo Go only runs projects on the current
SDK, so falling behind means the app can no longer be opened on a phone without
building a custom dev client. Keep it current.

## v1 scope

Owner decisions that override the spec. Recorded here because several of them
reverse something §2 or §9 states outright.

**2026-09-08 — free game, no monetisation:**

- **Sound is cut from the product entirely.** Not deferred; removed.
- **Ads, Remove Ads IAP and HINT all move to v2.** Without ads or a purchase
  there is nothing to gate a hint on, so the HINT button, the Remove Ads
  settings row and both ad/bonus sheets are absent from v1.
- **Haptics is the only setting.**

The hint economy built for the earlier scope is preserved in `src/core/hints.ts`
with its 26 tests, deliberately unwired and not exported from the core barrel, so
v2 can pick it up without redesigning it.

**2026-09-09 — a loss state, and an endless progression:**

- **Running out of moves loses the level.** The limit is `optimal × 4`, so a
  5-move puzzle allows 20. This is a real departure from spec §2/§30, which rule
  out lives and fail states; it is the owner's call, and it is now the only way
  to lose.
- **9 curated levels, then generated forever.** Levels 1-3 teach CROSS, 4-6 add
  ROW, 7-9 add COLUMN. From level 10 the progression is generated from the level
  number and never ends. This replaces spec §9's fixed 30.
- **Infinite FLIP is gone as a separate mode.** With an endless progression it
  was doing the same job twice — PLAY simply keeps going.

## Status

Playable end to end. Verified in the browser (Home → PLAY → solve → completion →
next level, a full Daily run, progress surviving a reload) and confirmed running
on a physical device via Expo Go.

| Step | Area | State |
| --- | --- | --- |
| 1 | Core board / actions | done |
| 2 | Automated core tests | done — 176 tests |
| 3 | Solver (GF(2)) | done, verified against exhaustive BFS |
| 4 | Generator | done |
| 5 | 9 curated levels locked | done — `src/content/campaign.v1.json` |
| 6 | Gameplay UI | done — board, flip, preview |
| 7 | Home / navigation / screens | done |
| 8 | Persistence | done — AsyncStorage, verified across a reload |
| 9 | Daily | done — played through, spec §11 copy confirmed |
| 10 | Endless levels | done — generated from level 10 on, no ceiling |
| 11–12 | Hint / ads / IAP | **deferred to v2** — see "v1 scope" |
| 13 | Haptics | done — tap, solve and failure feedback |
| — | Move limit / loss | done — verified in browser, limit and recovery |
| — | Device run | confirmed working in Expo Go |
| 14 | Accessibility / responsive polish | roles and labels in place; layout verified at 375pt |
| — | Localisation | done — English + Ukrainian, toggle in Settings |
| 15 | QA / release prep | listing, policy and build config in `store/` |

```bash
npm install
npm test                    # 176 tests
npm run typecheck
npm run generate:campaign   # re-author locked content (see "Locked content")
python3 scripts/generate-icons.py   # re-author the icon set

npm start                   # dev server — scan the QR with Expo Go
npm run web                 # browser preview (haptics are a no-op here)
```

### Running on a phone

1. Install **Expo Go** from the App Store or Google Play.
2. `npm start`, with the phone and this machine on the same Wi-Fi.
3. iOS: scan the QR with the Camera app. Android: scan it from inside Expo Go.

If the network blocks it (guest Wi-Fi, client isolation), use `npx expo start
--tunnel`.

Haptics need **real hardware** — both simulators and the web build report
success and do nothing.

## Layout

```
src/core/          platform-agnostic game logic — no DOM, React Native or Node APIs
  types.ts         CellState, CellType, GridSize, LevelData
  bits.ts          board-as-bitmask helpers
  board.ts         construction, conversion, solved detection
  actions.ts       CROSS / ROW / COLUMN, and action dedup
  gf2.ts           Gaussian elimination over GF(2)
  solver.ts        solvability, optimal move count, optimal solution, BFS verifier
  rng.ts           seeded mulberry32 + FNV-1a string hash
  generator.ts     scramble → solve → filter pipeline
  config.ts        fixed configuration that is part of the determinism contract
  campaign.ts      the 9-level teaching curve, plus the generated run above it
  levels.ts        level lookup — locked content below 10, generated above
  engine.ts        one puzzle in progress: moves, move limit, restart, preview
  hints.ts         hint wallet — UNWIRED, reserved for v2
  progress.ts      Best, stars, unlock progression
  daily.ts         one deterministic puzzle per calendar date
  index.ts         public surface — the UI layer imports only from here
src/content/       locked, versioned puzzle content (committed artifacts)
assets/            generated icon set — regenerate, do not hand-edit
scripts/           content and asset authoring
tests/             mirrors spec §26
```

`src/core` is free of platform APIs, so it drops into the Expo app unchanged and
stays testable headless (spec §24).

## How the solver works

Every action is a XOR mask over the board, so the game is a linear system over
GF(2): `A · x = b`, where `b` is the set of cells that must change. Boards are at
most 5×5, so a whole board state fits in one 32-bit integer and elimination is
XOR-ing rows together.

Optimality needs more than *a* solution. Elimination gives one particular
solution plus a null-space basis; every solution is the particular one XORed with
some subset of that basis, so the minimum move count is the lightest member of
that family. The search is bounded: after deduplicating actions by effect there
are at most 25 distinct masks, and `k` distinct non-zero vectors require rank
≥ log2(k+1), so the null space is at most 20-dimensional.

Deduplication is load-bearing, not just an optimisation. Any tap in a ROW has the
same effect (spec §26), so two different cells can drive one action — playing
both costs two moves and cancels out, and an optimal solution never does it.

`bruteForceSolve()` is an independent breadth-first search used by the tests to
check the GF(2) optimality claims (spec §13). It is verified against **all 512**
3×3 boards across 12 mechanic layouts, plus sampled 4×4 boards.

## Locked content

The 9 curated levels are a committed artifact in `src/content/campaign.v1.json`.
The app reads them from there and never regenerates them, so an app update cannot
hand a player different puzzles mid-run (spec §9, §25). Levels 10+ are generated
from the level number, so they are equally stable without being stored.

`npm run generate:campaign` re-authors that file. A test asserts the committed
content still reproduces from its seeds — so changing generator logic fails the
suite rather than silently rewriting released levels. Changing the generator
therefore means: bump `GENERATOR_VERSION`, re-run the script, and re-lock
deliberately.

The authored curve, all verified to have exactly the stated optimal move count:

| Levels | Mechanics | Size | Optimal moves |
| --- | --- | --- | --- |
| 1–3 | CROSS | 3×3 | 2, 3, 4 |
| 4–6 | CROSS + ROW | 3×3 → 4×4 | 3, 4, 5 |
| 7–9 | all three | 4×4 | 5, 6, 7 |

Level 10 opens at 4×4 / 7 moves — exactly level 9's shape and difficulty — so the
seam between authored and generated content is invisible. From there the ramp
climbs every other level to a ceiling of 15 moves on 5×5 and 10 on 4×4.

## Responsive

Verified at 375pt, the narrowest modern iPhone, in Ukrainian (the longer of the
two languages). Nothing overflows or clips; a 5×5 board lands at 54pt cells,
comfortably past the 44pt touch minimum.

The tightest element is the SETTINGS button on Home: "НАЛАШТУВАННЯ" clears
375pt with about 11pt to spare, and would start clipping below ~364pt. Both
Home tile labels are `numberOfLines={1}` so that large accessibility type
truncates rather than wrapping and breaking the 48pt button.

To re-test a width, temporarily set `layout.screenMaxWidth` in `src/ui/theme.ts`
— the app frame is what constrains the content, so narrowing it reproduces a
narrow device exactly. Browser devtools viewport emulation does *not* work here:
it changes `screen` but leaves `innerWidth` at the window size.

## Localisation

English and Ukrainian, switchable in Settings. First run follows the device
language; the setting is a deliberate override from then on.

All copy lives in `src/i18n/strings.ts` — no string literals in components.
Two things to keep in mind when editing it:

- **Labels are caps with wide tracking**, so Ukrainian has to be short. Literal
  translations overflow: "НАСТУПНИЙ РІВЕНЬ" does not fit a 56pt button, so the
  button says "ДАЛІ" the way a native app would.
- **Ukrainian has three plural forms.** `ukPlural` implements the real rule, so
  the game says "2 ХОДИ" and "5 ХОДІВ" rather than picking one and hoping.
  Getting this wrong is the loudest sign of a machine translation.

The word "puzzle" is banned from the interface (owner, 2026-09-09). It survives
in two places on purpose: Apple's fixed "Puzzle" category, and the App Store
keyword list, which is never displayed and exists only for search matching —
both flagged in `store/`.

## Publishing

`store/HANDOFF.md` is the document to give whoever uploads the app. It carries
every App Store Connect value, the build commands, and the list of things that
are deliberately absent so they are not mistaken for gaps.

Two steps remain and both need a real device or Xcode: the build itself, and
screenshots (`store/screenshots.md` fixes the shot list so the build only has
to happen once).

## Icon

`python3 scripts/generate-icons.py` authors the whole set from one derivation —
never hand-edit the PNGs.

The artwork is the CROSS mechanic drawn as a board. Its one geometric rule: the
margin from the artwork to the canvas edge equals the gap between two cells, so
the grid reads as a continuous board rather than a motif floating in space.

Two mask facts drove the rest, both measured rather than assumed:

- **iOS** applies a continuous-corner squircle. At this size the corner cells
  clear it with 99.9% of their area intact — tight, so if the geometry changes,
  re-measure before shipping. `icon.png` is deliberately a full-bleed square
  with sharp corners; baking in a radius would double-round the result.
- **Android** launchers may mask the adaptive foreground to a *circle*, which
  would slice the corner cells clean off. So `adaptive-icon.png` drops them and
  shows the cross alone — a shape that inscribes in a circle happily. Verified
  at zero lit pixels outside the circular safe zone.

That makes Android show five cells where iOS shows nine. The alternative is
shrinking the Android board to ~47% so its corners survive a circle, which reads
noticeably smaller than the iOS icon beside it.

## Decisions taken

Where the spec is silent, spec §30 says to choose the smallest implementation
consistent with the existing design. These are the calls made:

- **Star thresholds** are undefined in the spec. Reproduced from the prototype:
  3 stars at or under the level's optimal count, 2 within two moves of it,
  otherwise 1. Confirmed by the owner on 2026-09-08.
- **Spec §17 (hints), §18 (monetisation) and the Sound half of §22 do not apply
  to v1.** See "v1 scope". Spec §29's definition of done is correspondingly
  narrower: the hint and Remove Ads clauses are v2 acceptance criteria.
- **The DAILY FLIP card carries an orbiting border segment while today's puzzle
  is unplayed** (owner request, 2026-09-09). This is *not* in the prototype — it
  is an addition beyond the visual source of truth, kept deliberately quiet: one
  hairline segment at the card's own border weight, no glow or colour, and it
  disappears the moment the Daily is done.
- **The home background tile fades in, flips and fades out in place** (owner
  request, 2026-09-09), replacing the prototype's tile that hopped around the
  grid. It reuses the board cell's two-face flip so the gesture reads as the same
  object, but eased at both ends and slower — ambience, not feedback.
- **Haptics fire on every tap (light) and on solve (success notification).**
  Solving does not stack the two. All haptics calls are fire-and-forget and
  swallow errors — a device without a taptic engine degrades to silence rather
  than interrupting a move.
- **v1 persists only progress, Daily and the haptics setting.** The Remove Ads
  entitlement and hint wallet that spec §23 lists have nothing to store yet.
  `reconcile` defaults any missing field, so v2 needs no migration.
- **Daily configuration** is fixed at 4×4, all three mechanics, 5–7 optimal
  moves (the spec sets no band). Matches the prototype's 4×4 / par 6.
- **Daily rolls over at local midnight**, not UTC.
- **Infinite** starts at 12 moves and ramps to 15, so it never opens easier than
  the level 30 finale it unlocks after. Every third puzzle is 4×4 for variety.
- **"NEW BEST"** shows only when a previous Best was beaten, so a first
  completion is not announced as a record. Matches the prototype.

## Where the prototype and the spec disagree

Spec §1: the document wins on product behaviour. Recorded here so the visual pass
does not reintroduce the prototype's behaviour along with its look.

| Prototype | Spec | Implemented |
| --- | --- | --- |
| Endless procedural levels, level select grows without limit | §9: exactly 30, then Infinite FLIP | **Prototype** — owner overruled the spec on 2026-09-09 |
| No lock enforcement; seeds fake progress to level 77 | §10: locked levels cannot be opened | Spec |
| "Solution" is just the scramble, so HINT can point at a non-optimal move | §17: the move must be part of an optimal solution | Spec — real solver |
| Daily seed hardcoded to `20260908` | §11: hash of date + generator version | Spec |
| Restart hands back a free hint | §6 / §17 | Moot — v1 has no hints |

The prototype's *visual* layer is unaffected by all of this and remains the
reference for the UI pass. Extracted design tokens (colours, geometry, type,
motion) are in the prototype's `<style>` block — the bundled HTML unpacks to
readable source, which is where those tokens live.

## Deferred to v2

Confirmed with the owner, 2026-09-08:

1. **Rewarded ads** — the hint economy in `src/core/hints.ts` is designed and
   tested against them.
2. **Remove Ads IAP.** Price is still open; spec §18 says $2.99 is a placeholder
   and nothing hardcodes it.
3. **HINT.** Accumulated bonus hints are **uncapped** by owner decision.
4. **Infinite Best.** Spec §12 asks for a Best per puzzle; there is no per-puzzle
   store yet, so an Infinite result currently stands alone.

## Next

1. **Play Infinite through** — it generates and is reachable from PLAY after
   level 30, but has not been driven end to end.
2. **Responsive and accessibility polish** (§28 step 14) — 5×5 on a small phone,
   and dynamic type.
3. **QA and release prep** (step 15).
