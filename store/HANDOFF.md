# Handoff — publishing Flip Field to the App Store

Start here. Everything below is either a value to paste into App Store Connect
or a decision that has already been made and reasoned through. Where something
is genuinely unresolved it is marked **OPEN**.

The other files in this folder are the detail: `listing-en.md` and
`listing-uk.md` hold the copy, `screenshots.md` the shot list,
`privacy-policy.md` and `terms.md` the legal text, `README.md` the checklist
this document summarises.

## What you need before starting

| | |
| --- | --- |
| Apple Developer Program | Active. Owner has access. |
| App Store Connect access | Owner must invite you, or hand over the account. |
| Expo account | `danli948555` — needed only to run builds. |
| Repo | `github.com/denislinnik948-lgtm/flip` (public) |

## Two things are not done yet

1. **The build.** No IPA exists. The command is below; it needs an interactive
   Apple login the first time, which is why it has not been run.
2. **Screenshots.** They must come from a real build. `screenshots.md` fixes
   exactly what to capture and how to reach each state — read it before
   building, so you only build once.

Everything else in this document is ready to paste.

## Values for App Store Connect

### App information

| Field | Value |
| --- | --- |
| Name | `Flip Field` |
| Bundle ID | `studio.li.flip` |
| SKU | `flip-field-001` |
| Primary language | English (U.S.) |
| Category | Games → Puzzle |
| Secondary category | Games → Board |
| Age rating | 4+ — answer "None" to every content question |
| Copyright | `2026 LI Studio` |
| Price | Free, no in-app purchases |

`Flip Field` is 10 characters and that is deliberate: iOS truncates the name
under the home-screen icon at about twelve. Confirm it is still free before
creating the record — the name locks to it. Fallbacks: `Flip Field — Logic`,
`Flip Field Puzzles`.

### URLs

Both are live. Apple auto-rejects submissions where these 404, so check them
once before submitting.

```
Privacy Policy URL
https://denislinnik948-lgtm.github.io/flip/privacy.html

Support URL
https://denislinnik948-lgtm.github.io/flip/
```

Marketing URL: leave blank.

### Copy

Subtitle, promotional text, description and keywords are in `listing-en.md`
and `listing-uk.md`, already inside Apple's character limits with counts noted.
Paste them as they are — the Ukrainian is not a translation of the English, it
is written to fit the same constraints in a language that runs longer.

Add Ukrainian as a **listing localisation**. The app name stays `Flip Field` in
both; everything under it differs.

One judgement call to be aware of: the keyword lists include the genre word
"puzzle", which is banned from the app's own interface by the owner. Keywords
are never displayed to anyone — they exist only so App Store search can match
the app, and it is the highest-traffic term in the category. The owner approved
this. Remove it only if instructed.

### App privacy

Answer **"No, we do not collect data from this app."** Nothing else in the
questionnaire applies.

This is not a simplification. The app makes no network requests at runtime, has
no analytics, no crash reporting, no ads, no account and no identifiers. The
only stored data is progress and two settings, written to on-device storage.

It stops being true the moment ads are added — see "v2" below.

### Export compliance

Already declared in `app.json` as `ITSAppUsesNonExemptEncryption: false`, so
App Store Connect should not ask. If it does, the answer is that the app uses
no non-exempt encryption.

A privacy manifest is also declared (`ios.privacyManifests`) covering
`UserDefaults` with reason `CA92.1` — required since Apple's 2024 rules,
because the save file goes through it.

## Building

```bash
git clone https://github.com/denislinnik948-lgtm/flip.git
cd flip
npm install

npx eas-cli login                 # account danli948555
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

The first build asks for the Apple ID and generates the certificates itself.
It takes 10–20 minutes.

`autoIncrement` is on in the production profile, so repeat uploads of the same
version do not collide on build number.

For screenshots, build the `development` profile instead and install it on a
device — or, with Xcode installed, `--simulator` needs no Apple credentials at
all and the simulator saves screenshots at exact device resolution with `Cmd+S`.

## Before each release

Bump `version` in `app.json` **and** `APP_VERSION` in
`src/ui/screens/SettingsScreen.tsx`. The About screen shows that string to
players, and a mismatch is the kind of thing a reviewer notices.

Sanity check before submitting:

```bash
npm test          # 176 tests
npm run typecheck
npx expo-doctor   # 18 checks
```

## What is deliberately absent

Do not treat these as oversights or "fix" them:

- **No ads, no in-app purchases, no hints.** Deferred to v2 by the owner. The
  hint economy is written and tested in `src/core/hints.ts` but deliberately
  unwired.
- **No sound.** Cut from the product, not deferred.
- **No leaderboard.** Results compare against the solver's proven minimum
  instead, which needs no server. This is why the privacy answers can be "we
  collect nothing".
- **No account, no network.** Same reason.

`../README.md` records every decision that overrides the original spec, and why.

## OPEN — needs the owner

- **Nothing blocking.** The name, URLs, copy, privacy answers and build config
  are all settled.
- The one thing worth confirming out loud: the owner has not yet held the app
  on a device with this build, so **haptics and the native animations are
  unverified**. They are implemented and guarded, but if the first device build
  feels wrong, that is where to look — `src/services/haptics.ts` and
  `src/ui/components/Cell.tsx`.
