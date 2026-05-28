import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from './locales/en/translation.json'
import arTranslation from './locales/ar/translation.json'

const STORAGE_KEY = 'nassila.locale'
const LEGACY_STORAGE_KEY_REFVERIFY = 'refverify.locale'

export type AppLocale = 'en' | 'ar'

export function readStoredLocale(): AppLocale {
  try {
    let v = localStorage.getItem(STORAGE_KEY)
    if (v === 'ar' || v === 'en') return v
    for (const legacyKey of [LEGACY_STORAGE_KEY_REFVERIFY]) {
      v = localStorage.getItem(legacyKey)
      if (v === 'ar' || v === 'en') {
        localStorage.setItem(STORAGE_KEY, v)
        localStorage.removeItem(legacyKey)
        return v
      }
    }
  } catch {
    /* private mode etc. */
  }
  return 'en'
}

export function persistLocale(lang: AppLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* noop */
  }
}

/** Sync `dir`/`lang` on <html>; call after locale changes. */
export function applyDomLocale(lang: AppLocale): void {
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en'
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/** Must run before rendering any `useTranslation` consumer. */
void i18n.use(initReactI18next).init({
  lng: typeof localStorage !== 'undefined' ? readStoredLocale() : 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: enTranslation },
    ar: { translation: arTranslation }
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

if (typeof document !== 'undefined') {
  applyDomLocale(readStoredLocale())
}

export function setAppLocale(lang: AppLocale): void {
  persistLocale(lang)
  void i18n.changeLanguage(lang)
  applyDomLocale(lang)
  if (typeof window !== 'undefined' && window.api?.setMenuLocale) {
    void window.api.setMenuLocale(lang)
  }
}

export default i18n
