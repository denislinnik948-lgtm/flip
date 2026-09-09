# Design reference

`FLIP Prototype (standalone).html` on the Desktop is a self-extracting bundle —
the app source is gzipped and base64'd inside it, so it is not readable or
greppable as shipped.

`prototype-unpacked.html` is that bundle's inner document, extracted verbatim.
It is the readable form of the **visual source of truth** (spec §21):

- the `<style>` block at the top carries the final design tokens — colour
  variants A/B/C, symbol and preview states, geometry, type scale, motion
- the markup below it is every screen: splash, home, game, levels, settings,
  about, daily complete, completion sheet, rewarded-ad sheet
- the `<script type="text/x-dc">` at the bottom is the prototype's own logic

It does not run standalone (it loads a runtime by UUID from the original
bundle). Read it, do not serve it.

Note that the prototype's *behaviour* diverges from the spec in several places —
see "Where the prototype and the spec disagree" in the root README. Its visual
layer is the reference; its game logic is not.

## Porting gotchas found so far

Things in the prototype that have no React Native equivalent, and how they were
resolved. Check this list before assuming a visual is "close enough".

- **`clip-path`** — used for the diagonal cuts on the LI STUDIO monogram (the
  L's tapered foot, the i's sheared stem). Rebuilt as `react-native-svg` paths
  at the prototype's exact coordinates. An early version dropped the cuts and
  the foot entirely, which turned "Li" into "I i".
- **`background-image` with repeating gradients + `mask-image`** — the home
  grid. Rebuilt as horizontal bands, each with its own hairlines at its own
  opacity, so the whole grid fades together.
- **Inline SVG icons** — ported verbatim into `src/ui/components/icons.tsx`,
  stroke widths and caps included. Do not redraw these by eye.
- **`box-shadow: inset`** — becomes `borderWidth` + `borderColor`, which sits on
  the same pixel for hairlines.
- **`Animated.createAnimatedComponent` around an SVG element** logs a batch of
  `non-boolean attribute collapsable` errors on web at mount. It is
  react-native-web forwarding a native-only prop to the DOM; harmless, one-off
  (React dedupes per component type, measured at 0/sec while animating), and
  absent on device.

Two visuals are **not** from the prototype and were added on the owner's request
on 2026-09-09 — do not "correct" them against the HTML:

- the orbiting border segment on the DAILY FLIP card, and
- the home background tile flipping in place instead of hopping across the grid.
