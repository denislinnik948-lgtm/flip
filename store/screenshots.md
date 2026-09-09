# Screenshots

## Why these cannot be produced from this machine

App Store screenshots have to come from the real app. That needs one of:

- **iOS Simulator** — requires Xcode.app. Only the Command Line Tools are
  installed here (`xcode-select -p` → `/Library/Developer/CommandLineTools`),
  so `simctl` does not exist and no simulator can run.
- **A device build** — needs the interactive Apple credential step.

The browser preview is not a substitute. It renders through
`react-native-web`, so letter-spacing, font metrics and the flip animation
differ from the native build in ways that cannot be verified from here — and
Apple's tooling requires exact pixel dimensions the preview cannot produce.

Submitting web-rendered images as product screenshots would mean shipping
pictures of something that is not quite the app. So the shot list below is the
deliverable instead: it fixes what to capture and how to reach each state, so
the only thing left is pressing the shutter on a real build.

## What Apple needs

One set is enough — Apple scales it down for smaller devices.

| Device class | Pixels | Simulator |
| --- | --- | --- |
| 6.9" iPhone | 1320 × 2868 | iPhone 16 Pro Max |

Up to 10 per localisation; 3–5 is the sweet spot. Order matters — the first two
are what people actually see in search results.

Take them **in Ukrainian and English separately** if both listings get their own
set. If only one set is uploaded, use English.

## The shots, in order

### 1 — The board mid-solve · the money shot

The one image that has to explain the game. A 5×5 board with a mix of on and
off tiles and all three symbols visible.

- Level 17 (5×5, 11 optimal, limit 44).
- Play 3–4 moves so the board looks worked-on rather than freshly dealt.
- Header reads `LEVEL 17` and e.g. `4 / 44`.

To reach it: levels unlock in sequence, so either play through 1–16 or use a
device where you already have. Levels 1, 5, 9 solve in 2, 4 and 7 moves —
optimal solutions are recorded in `src/content/campaign.v1.json` and, for
generated levels, printed by `levelFor(n).optimalSolution`.

### 2 — Press-and-hold preview

The mechanic no static image otherwise conveys: hold a cell and the affected
cells lift and connect.

- Same level. **Press and hold** a CROSS cell near the middle and screenshot
  while holding.
- The connector lines between neighbouring cells must be visible — that is the
  detail that reads as "these move together".

Hold a ROW or COLUMN cell instead if the resulting shape reads more clearly.

### 3 — Completion

- Solve any level. Level 1 takes 2 moves: tap cells 5 then 8 (0-indexed,
  row-major).
- For three stars the solve has to be at or under optimal, so use the recorded
  solution.
- Sheet shows `COMPLETE`, `★★★`, the move count, and `PERFECT / BEST POSSIBLE`.

### 4 — Home

- Fresh-ish state. The DAILY FLIP card should be **unplayed** so the orbiting
  border is running.
- Wait for the background tile to be mid-flip if you can — it is subtle and
  worth catching.

### 5 — Out of moves · optional

Shows the game has stakes, and that losing is soft.

- Level 1, tap the same cell 8 times. The sheet shows how many moves from
  solved you were.

Consider whether to include it: it advertises a fail state on a game whose
appeal is calm. Fifth position, or omit.

## Do not

- **No captions or marketing frames.** The game is minimal; a screenshot with
  added text and a gradient background undoes that in one image.
- **No status bar clutter.** Full battery, full signal, no notifications.
  Simulator gives this for free.
- **No debug builds with the Expo dev menu visible.**

## Getting them

```bash
# device build
npx eas-cli build --profile development --platform ios

# or, with Xcode installed, a simulator build needs no Apple credentials
npx eas-cli build --profile development --platform ios --simulator
```

In the simulator: `Cmd+S` saves a screenshot at exact device resolution.
