import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './locales/vi.json'
import en from './locales/en.json'

const STORAGE_KEY = 'histar_locale'

function readStoredLocale(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'vi' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'vi'
}

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: readStoredLocale(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

export function setAppLocale(locale: 'vi' | 'en') {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(locale)
}

export default i18n
