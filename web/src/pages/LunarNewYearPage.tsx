import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'

// Zodiac lucky numbers (static)
const luckyNumbers = [2, 7]

// Wikipedia article names by language (article names differ per language)
const wikiArticles: Record<string, Record<string, string>> = {
  hanbok: {
    en: 'Hanbok',
    es: 'Hanbok',
    zh: '韩服',
    ko: '한복',
    vi: 'Hanbok',
    ja: '韓服_(朝鮮の服)',
  },
  qipao: {
    en: 'Cheongsam',
    es: 'Qipao',
    zh: '旗袍',
    ko: '치파오',
    vi: 'Sườn_xám',
    ja: 'チャイナドレス',
  },
  aoDai: {
    en: 'Áo_dài',
    es: 'Áo_dài',
    zh: '越式旗袍',
    ko: '아오자이',
    vi: 'Áo_dài',
    ja: 'アオザイ',
  },
  kimono: {
    en: 'Kimono',
    es: 'Kimono',
    zh: '和服',
    ko: '기모노',
    vi: 'Kimono',
    ja: '着物',
  },
  horseZodiac: {
    en: 'Horse_(zodiac)',
    es: 'Caballo_(astrología_china)',
    zh: '马_(生肖)',
    ko: '말_(십이지)',
    vi: 'Ngọ',
    ja: '午_(十二支)',
  },
}

// Get Wikipedia URL for a given article and language
const getWikiUrl = (article: string, lang: string): string => {
  const wikiLang = lang.startsWith('zh') ? 'zh' : lang.split('-')[0]
  const articleName = wikiArticles[article]?.[wikiLang] || wikiArticles[article]?.en || article
  return `https://${wikiLang}.wikipedia.org/wiki/${articleName}`
}

// Local businesses (not translated - proper nouns)
const localBusinesses = [
  { name: 'Saigon Bistro', type: 'Vietnamese', area: 'Fayetteville' },
  { name: 'Ben Thanh', type: 'Vietnamese', area: 'Fayetteville' },
  { name: 'Nak Won Korean', type: 'Korean', area: 'Fayetteville' },
  { name: 'Ponderosa Asian Grocery', type: 'Grocery', area: 'Fayetteville' },
  { name: 'Thai Pepper', type: 'Thai', area: 'Fayetteville' },
  { name: 'Taste of China', type: 'Chinese', area: 'Fayetteville' },
]

export default function LunarNewYearPage() {
  const { t, i18n } = useTranslation('lunarNewYear')
  const currentLang = i18n.language

  // Game keys for iteration
  const gameKeys = ['mahjong', 'yutNori', 'go', 'chineseChess', 'bigTwo', 'cauCa'] as const
  const foodKeys = ['jiaozi', 'tteokguk', 'banhChung', 'springRolls', 'mochi', 'nianGao'] as const
  const drinkKeys = ['sujeonggwa', 'jasmineTea', 'bobaTea', 'sake', 'traDa'] as const
  const attireKeys = ['hanbok', 'qipao', 'aoDai', 'kimono'] as const
  const traitKeys = ['energetic', 'independent', 'adventurous', 'passionate', 'freeSpirited'] as const
  const colorKeys = ['red', 'pink', 'purple'] as const
  const compatibleKeys = ['tiger', 'dog', 'sheep'] as const


  // Color hex values
  const colorHex: Record<string, string> = {
    red: '#dc2626',
    pink: '#db2777',
    purple: '#7c3aed',
  }

  // Attire image URLs (static, not translated) - Using Unsplash for reliable loading
  const attireImages: Record<string, string> = {
    hanbok: 'https://images.unsplash.com/photo-1560083372-efb6689e3f23?w=400&h=300&fit=crop&crop=top',
    qipao: '/images/attire/qipao.jpg',
    aoDai: 'https://images.unsplash.com/photo-1529232356377-57971f020a94?w=400&h=300&fit=crop&crop=top',
    kimono: 'https://images.unsplash.com/photo-1615790469465-2f1e2770280a?w=400&h=300&fit=crop&crop=top',
  }

  // Recent birth years for compatible zodiac signs (12-year cycle)
  const compatibleYears: Record<string, string> = {
    tiger: '2022, 2010, 1998, 1986, 1974',
    dog: '2018, 2006, 1994, 1982, 1970',
    sheep: '2015, 2003, 1991, 1979, 1967',
  }

  // Difficulty colors
  const difficultyColors: Record<string, string> = {
    mahjong: 'intermediate',
    yutNori: 'easy',
    go: 'advanced',
    chineseChess: 'intermediate',
    bigTwo: 'easy',
    cauCa: 'easy',
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-red-700 via-red-600 to-amber-600 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-9xl">馬</div>
          <div className="absolute bottom-10 right-10 text-9xl">福</div>
          <div className="absolute top-1/2 left-1/4 text-7xl">春</div>
          <div className="absolute top-1/3 right-1/4 text-7xl">喜</div>
        </div>

        {/* Lantern decorations */}
        <div className="absolute top-0 left-1/4 w-16 h-24 bg-red-500/50 rounded-full blur-xl" />
        <div className="absolute top-0 right-1/3 w-20 h-28 bg-amber-500/50 rounded-full blur-xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
          {/* Language Switcher */}
          <div className="mb-8">
            <LanguageSwitcher variant="hero" />
          </div>

          <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
            {t('hero.date')}
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4">
            {t('hero.title')}
          </h1>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-light mb-8">
            {t('hero.subtitle')}
          </div>

          <div className="text-8xl sm:text-9xl mb-8">
            🐴
          </div>

          <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto mb-10">
            {t('hero.description')}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#participate"
              className="px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-amber-100 transition-colors shadow-lg"
            >
              {t('hero.cta.getInvolved')}
            </a>
            <a
              href="#games"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              {t('hero.cta.exploreActivities')}
            </a>
          </div>
        </div>
      </section>

      {/* Community Welcome */}
      <section className="py-16 sm:py-20 bg-sand">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {t('community.title')}
            </h2>
            <p className="text-lg text-stone mb-8 leading-relaxed">
              {t('community.description1')}
            </p>
            <p className="text-lg text-stone leading-relaxed">
              {t('community.description2')}
            </p>
          </div>
        </div>
      </section>

      {/* Zodiac Info */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('zodiac.title')}
            </h2>
            <p className="text-stone max-w-2xl mx-auto">
              {t('zodiac.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-amber-50 p-6 rounded-2xl border border-red-100">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="font-bold text-gray-900 mb-2">{t('zodiac.traits.title')}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {traitKeys.map((trait) => (
                  <span key={trait} className="px-3 py-1 bg-white rounded-full text-sm text-stone">
                    {t(`zodiac.traits.${trait}`)}
                  </span>
                ))}
              </div>
              <a
                href={getWikiUrl('horseZodiac', currentLang)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
              >
                Source: Wikipedia
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-amber-50 p-6 rounded-2xl border border-red-100">
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="font-bold text-gray-900 mb-1">{t('zodiac.luckyColors.title')}</h3>
              <p className="text-xs text-stone mb-3">{t('zodiac.luckyColors.subtitle')}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {colorKeys.map((color) => (
                  <span
                    key={color}
                    className="px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: colorHex[color] }}
                  >
                    {t(`zodiac.luckyColors.${color}`)}
                  </span>
                ))}
              </div>
              <a
                href="https://www.korea.net/NewsFocus/Culture/view?articleId=284757"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
              >
                Source: Korea.net
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-amber-50 p-6 rounded-2xl border border-red-100">
              <div className="text-4xl mb-3">🔢</div>
              <h3 className="font-bold text-gray-900 mb-1">{t('zodiac.luckyNumbers.title')}</h3>
              <p className="text-xs text-stone mb-3">{t('zodiac.luckyNumbers.subtitle')}</p>
              <div className="flex gap-3 mb-3">
                {luckyNumbers.map((num) => (
                  <span
                    key={num}
                    className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full font-bold"
                  >
                    {num}
                  </span>
                ))}
              </div>
              <a
                href="https://www.nippon.com/en/japan-data/h02544/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
              >
                Source: Nippon.com
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-amber-50 p-6 rounded-2xl border border-red-100">
              <div className="text-4xl mb-3">💕</div>
              <h3 className="font-bold text-gray-900 mb-2">{t('zodiac.compatible.title')}</h3>
              <div className="flex flex-wrap gap-3 mb-3">
                {compatibleKeys.map((animal) => (
                  <div key={animal} className="px-4 py-2 bg-white rounded-xl text-center">
                    <div className="font-medium text-gray-900">
                      {t(`zodiac.compatible.${animal}`)}
                    </div>
                    <div className="text-xs text-stone mt-0.5">
                      {compatibleYears[animal]}
                    </div>
                  </div>
                ))}
              </div>
              <a
                href="https://e.vnexpress.net/news/life/12-zodiac-signs-ranked-by-luck-in-the-year-of-the-fire-horse-2026-4993096.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
              >
                Source: VnExpress
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Traditional Games */}
      <section id="games" className="py-16 sm:py-20 bg-sand">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('games.title')}
            </h2>
            <p className="text-stone max-w-2xl mx-auto">
              {t('games.description')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameKeys.map((gameKey) => (
              <div
                key={gameKey}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-dogwood/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{t(`games.${gameKey}.name`)}</h3>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                    {t(`games.${gameKey}.origin`)}
                  </span>
                </div>
                <p className="text-stone text-sm mb-4">{t(`games.${gameKey}.description`)}</p>
                <div className="flex items-center gap-4 text-xs text-stone">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {t(`games.difficulty.${difficultyColors[gameKey]}`)}
                  </span>
                  <span>{t(`games.${gameKey}.players`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Food & Drinks */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('food.title')}
            </h2>
            <p className="text-stone max-w-2xl mx-auto">
              {t('food.description')}
            </p>
          </div>

          {/* Foods */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">🥢</span> {t('food.luckyFoods')}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {foodKeys.map((foodKey) => (
                <div
                  key={foodKey}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-gray-900">{t(`food.${foodKey}.name`)}</h4>
                    <span className="px-2 py-1 bg-white text-stone text-xs rounded">
                      {t(`food.${foodKey}.origin`)}
                    </span>
                  </div>
                  <p className="text-stone text-sm mb-3">{t(`food.${foodKey}.description`)}</p>
                  <div className="text-xs text-amber-700 font-medium">
                    ✨ {t(`food.${foodKey}.symbolism`)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drinks */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">🍵</span> {t('food.traditionalDrinks')}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {drinkKeys.map((drinkKey) => (
                <div
                  key={drinkKey}
                  className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-2xl border border-green-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-gray-900">{t(`food.${drinkKey}.name`)}</h4>
                    <span className="px-2 py-1 bg-white text-stone text-xs rounded">
                      {t(`food.${drinkKey}.origin`)}
                    </span>
                  </div>
                  <p className="text-stone text-sm">{t(`food.${drinkKey}.description`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cultural Dress */}
      <section className="py-16 sm:py-20 bg-sand">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('attire.title')}
            </h2>
            <p className="text-stone max-w-2xl mx-auto">
              {t('attire.description')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {attireKeys.map((attireKey) => (
              <a
                key={attireKey}
                href={getWikiUrl(attireKey, currentLang)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={attireImages[attireKey]}
                    alt={t(`attire.${attireKey}.name`)}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">
                    {t(`attire.${attireKey}.name`)}
                  </h3>
                  <p className="text-amber-600 text-sm font-medium mb-3">{t(`attire.${attireKey}.origin`)}</p>
                  <p className="text-stone text-sm mb-3">{t(`attire.${attireKey}.description`)}</p>
                  <span className="text-red-600 text-sm font-medium inline-flex items-center gap-1">
                    {t('attire.learnMoreWikipedia')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Local Asian Businesses */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('businesses.title')}
            </h2>
            <p className="text-stone max-w-2xl mx-auto">
              {t('businesses.description')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {localBusinesses.map((business) => (
              <div
                key={business.name}
                className="flex items-center gap-4 p-4 bg-sand rounded-xl"
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                  🏪
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{business.name}</h3>
                  <p className="text-sm text-stone">{business.type} • {business.area}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Involved CTA */}
      <section id="participate" className="py-16 sm:py-20 bg-gradient-to-br from-red-700 via-red-600 to-amber-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {t('participate.title')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('participate.description')}
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl text-left">
              <h3 className="text-xl font-bold mb-3">{t('participate.waysToParticipate')}</h3>
              <ul className="space-y-2 text-white/90">
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.teachGame')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.shareRecipe')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.perform')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.display')}
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl text-left">
              <h3 className="text-xl font-bold mb-3">{t('participate.forBusinesses')}</h3>
              <ul className="space-y-2 text-white/90">
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.sponsor')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.provideSamples')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.vendorBooth')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  {t('participate.items.specialPromo')}
                </li>
              </ul>
            </div>
          </div>

          <a
            href="https://discord.gg/gnq73U54jK"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-amber-100 transition-colors shadow-lg"
          >
            {t('participate.cta')}
          </a>
        </div>
      </section>

      {/* Learn More / Sources */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('learnMore.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://www.korea.net/NewsFocus/Culture/view?articleId=284757"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-sand rounded-xl hover:bg-red-50 transition-colors group"
            >
              <h3 className="font-bold text-gray-900 group-hover:text-red-600 mb-1">
                {t('learnMore.sources.koreaNet.title')}
              </h3>
              <p className="text-sm text-stone">{t('learnMore.sources.koreaNet.description')}</p>
            </a>
            <a
              href="https://www.nippon.com/en/japan-data/h02544/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-sand rounded-xl hover:bg-red-50 transition-colors group"
            >
              <h3 className="font-bold text-gray-900 group-hover:text-red-600 mb-1">
                {t('learnMore.sources.nipponCom.title')}
              </h3>
              <p className="text-sm text-stone">{t('learnMore.sources.nipponCom.description')}</p>
            </a>
            <a
              href="https://www.scmp.com/lifestyle/chinese-zodiac/article/3335586/why-year-fire-horse-2026-could-bring-chaos-also-great-progress"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-sand rounded-xl hover:bg-red-50 transition-colors group"
            >
              <h3 className="font-bold text-gray-900 group-hover:text-red-600 mb-1">
                {t('learnMore.sources.fireHorse.title')}
              </h3>
              <p className="text-sm text-stone">{t('learnMore.sources.fireHorse.description')}</p>
            </a>
            <a
              href="https://www.si.edu/spotlight/lunar-year-horse"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-sand rounded-xl hover:bg-red-50 transition-colors group"
            >
              <h3 className="font-bold text-gray-900 group-hover:text-red-600 mb-1">
                {t('learnMore.sources.smithsonian.title')}
              </h3>
              <p className="text-sm text-stone">{t('learnMore.sources.smithsonian.description')}</p>
            </a>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="py-12 bg-sand">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-stone">
            {t('footer.initiative')}
          </p>
          <p className="text-2xl mt-4">
            🧧 恭喜發財 • 새해 복 많이 받으세요 • Chúc Mừng Năm Mới 🧧
          </p>
        </div>
      </section>
    </div>
  )
}
