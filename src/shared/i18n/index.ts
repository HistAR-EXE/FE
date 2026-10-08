import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './locales/vi.json'
import en from './locales/en.json'
import ko from './locales/ko.json'
import zhCN from './locales/zh-CN.json'

const STORAGE_KEY = 'histar_locale'
export const SUPPORTED_LOCALES = ['vi', 'en', 'ko', 'zh-CN'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

function readStoredLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED_LOCALES.includes(stored as AppLocale)) return stored as AppLocale
  } catch {
    /* ignore */
  }
  return 'vi'
}

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    ko: { translation: ko },
    'zh-CN': { translation: zhCN },
  },
  lng: readStoredLocale(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

export function setAppLocale(locale: AppLocale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(locale)
}

export function nextAppLocale(locale: string): AppLocale {
  const index = SUPPORTED_LOCALES.indexOf(locale as AppLocale)
  return SUPPORTED_LOCALES[(index + 1 + SUPPORTED_LOCALES.length) % SUPPORTED_LOCALES.length]
}

export default i18n
