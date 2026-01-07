import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'

interface LanguageSwitcherProps {
  variant?: 'default' | 'hero'
}

export default function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    document.documentElement.lang = langCode
  }

  if (variant === 'hero') {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              i18n.language === lang.code || i18n.language.startsWith(lang.code)
                ? 'bg-white text-red-700 shadow-md'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <span className="mr-1.5">{lang.flag}</span>
            <span className="hidden sm:inline">{lang.nativeName}</span>
            <span className="sm:hidden">{lang.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.nativeName}
        </option>
      ))}
    </select>
  )
}
