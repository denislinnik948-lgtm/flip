# App Store submission

**Handing this to someone else? Start with `HANDOFF.md`** — it is the single
document that gathers every value to paste into App Store Connect, plus the
decisions already made.

This file is the underlying checklist: everything App Store Connect asks for,
and who has to supply it.

## Ready in this repo

| Item | Where |
| --- | --- |
| App icon, 1024×1024, no alpha | `assets/icon.png` |
| Listing copy, English | `store/listing-en.md` |
| Listing copy, Ukrainian | `store/listing-uk.md` |
| Privacy policy (both languages) | `store/privacy-policy.md` |
| Terms of use (both languages) | `store/terms.md` |
| App privacy answers | "App privacy" below |
| Export compliance | `ITSAppUsesNonExemptEncryption: false` in `app.json` |
| Privacy manifest | `ios.privacyManifests` in `app.json` |
| Build config | `eas.json` |
| Screenshot shot list | `store/screenshots.md` |

## Blocked on the owner

These cannot be produced from the codebase.

1. **Apple Developer Program membership** — $99/year. Nothing can be submitted
   without it.
2. **Two public URLs.** Apple rejects submissions where these 404. Both pages
   live in `docs/` and are served by GitHub Pages from this repo (Settings →
   Pages → Branch `main`, folder `/docs`). This is why the repo is public: on a
   free plan Pages cannot serve a private one.
   - Privacy policy — `https://denislinnik948-lgtm.github.io/flip/privacy.html`
   - Support — `https://denislinnik948-lgtm.github.io/flip/`
3. **Screenshots.** Required: 6.9" iPhone (1320×2868). Must come from a real
   build — this machine has no Xcode, so no simulator. `screenshots.md` fixes
   the shot list, the order, and how to reach each state, so the only step left
   is capturing them.
4. **The app name is `Flip Field`** — confirm it is still free in App Store
   Connect before creating the record, since the name locks to it. "FLIP" alone
   is taken by an existing game. See `listing-en.md` for the reasoning and
   fallbacks.
5. **Age rating questionnaire.** Answer "None" to every content question. The
   result is 4+.

## App privacy

The honest answer is the simple one: **this app collects nothing.**

- No network requests at runtime. No analytics, no crash reporting, no ads.
- The only stored data is progress, the daily result and two settings, written
  to on-device storage and never transmitted.
- No account, no login, no identifiers.

In App Store Connect, answer **"No, we do not collect data from this app."**
Nothing else in the questionnaire applies.

This stops being true the moment v2 adds ads — an ad SDK collects device
identifiers for tracking, which changes the answers and requires an App Tracking
Transparency prompt. Revisit this section then.

## Build and submit

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`autoIncrement` in the production profile bumps the build number, so repeat
uploads of the same version do not collide.

Before each release, bump `version` in `app.json` and keep `APP_VERSION` in
`src/ui/screens/SettingsScreen.tsx` in step — the About screen shows it to
players and a mismatch is the kind of thing reviewers notice.

## Category

Games → **Puzzle**. That is Apple's own taxonomy and cannot be renamed; the
"no puzzle in the copy" rule applies to the interface and the listing text we
write, not to Apple's fixed category list.
