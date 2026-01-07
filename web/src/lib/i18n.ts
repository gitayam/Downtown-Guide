import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enLunarNewYear from '../locales/lunar-new-year/en.json'
import zhLunarNewYear from '../locales/lunar-new-year/zh.json'
import koLunarNewYear from '../locales/lunar-new-year/ko.json'
import viLunarNewYear from '../locales/lunar-new-year/vi.json'
import jaLunarNewYear from '../locales/lunar-new-year/ja.json'
import esLunarNewYear from '../locales/lunar-new-year/es.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
] as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code']

const resources = {
  en: { lunarNewYear: enLunarNewYear },
  zh: { lunarNewYear: zhLunarNewYear },
  ko: { lunarNewYear: koLunarNewYear },
  vi: { lunarNewYear: viLunarNewYear },
  ja: { lunarNewYear: jaLunarNewYear },
  es: { lunarNewYear: esLunarNewYear },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'lunarNewYear',
    ns: ['lunarNewYear'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'fayetteville_language',
    },
  })

export default i18n
