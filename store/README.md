# App Store submission

Everything App Store Connect asks for, and who has to supply it.

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

## Blocked on the owner

These cannot be produced from the codebase.

1. **Apple Developer Program membership** — $99/year. Nothing can be submitted
   without it.
2. **Two public URLs.** Apple rejects submissions where these 404:
   - Privacy policy URL — host `privacy-policy.md` as a web page.
   - Support URL — a page or even a mailto-backed contact page.
   A GitHub Pages site or a one-page site is enough for both.
3. **Screenshots.** Required: 6.9" iPhone (1320×2868). Apple reuses those for
   smaller devices. They must come from a real build — the web preview is not a
   substitute, and simulator frames are acceptable to Apple but must be genuine
   app screenshots.
4. **The app name.** "FLIP" alone is very likely taken. App Store names are
   globally unique, so decide a fallback before creating the record — see
   `listing-en.md`.
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
