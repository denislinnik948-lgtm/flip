/**
 * Language resolution.
 *
 * The app opens in the device's language when it recognises it, and the setting
 * in Settings is a deliberate override that persists from then on.
 */

import { getLocales } from 'expo-localization';

import { COPY, LANGUAGES, type Language } from './strings';

export { COPY, LANGUAGES, LANGUAGE_NAME, type Copy, type Language } from './strings';

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The device's language if we speak it, English otherwise.
 *
 * Wrapped in a try/catch because locale lookup touches a native module: a
 * failure here must fall back, not stop the app from opening.
 */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return isLanguage(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLanguage(stored: unknown): Language {
  return isLanguage(stored) ? stored : deviceLanguage();
}

export function copyFor(language: Language) {
  return COPY[language];
}

/** The other language — the toggle only ever has two states. */
export function otherLanguage(current: Language): Language {
  return current === 'en' ? 'uk' : 'en';
}
