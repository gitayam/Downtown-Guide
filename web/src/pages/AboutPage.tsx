import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  ArrowRightIcon,
  SparklesIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function AboutPage() {
  const { t } = useTranslation('about')

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brick via-brick-600 to-forest overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-24 text-center text-white">
          {/* Language Switcher */}
          <div className="mb-8">
            <LanguageSwitcher variant="hero" />
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
        
        {/* The Vision */}
        <section className="text-center space-y-6">
          <h2 className="font-display text-3xl font-bold text-gray-900">
            {t('vision.title')}
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto">
            {t('vision.description')}
          </p>
        </section>

        {/* Date Planner Feature */}
        <section className="bg-gradient-to-br from-brick/5 via-dogwood/10 to-capefear/5 rounded-2xl p-8 md:p-12 border border-brick/10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brick/10 text-brick rounded-full text-sm font-medium">
                <SparklesIcon className="w-4 h-4" />
                {t('datePlanner.badge')}
              </div>
              <h2 className="font-display text-3xl font-bold text-gray-900">
                {t('datePlanner.title')}
              </h2>
              <p className="text-stone-600 leading-relaxed">
                {t('datePlanner.description1')}
              </p>
              <p className="text-stone-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('datePlanner.description2') }} />
              <p className="text-stone-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('datePlanner.description3') }} />
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <MapPinIcon className="w-4 h-4 text-brick" />
                  <span>{t('datePlanner.stats.venues')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <CalendarDaysIcon className="w-4 h-4 text-brick" />
                  <span>{t('datePlanner.stats.itineraries')}</span>
                </div>
              </div>
              <Link
                to="/plan-date"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brick text-white font-medium rounded-lg hover:bg-brick-600 transition-colors mt-4"
              >
                <SparklesIcon className="w-5 h-5" />
                {t('datePlanner.cta')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="w-full md:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg border border-sand p-4 space-y-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{t('datePlanner.sampleItinerary')}</p>
                <div className="space-y-2">
                  {[
                    { time: '9:00 AM', place: t('datePlanner.itinerary.coffee'), icon: '☕' },
                    { time: '10:30 AM', place: t('datePlanner.itinerary.galleries'), icon: '🎨' },
                    { time: '12:30 PM', place: t('datePlanner.itinerary.lunch'), icon: '🍽️' },
                    { time: '2:00 PM', place: t('datePlanner.itinerary.matinee'), icon: '🎭' },
                    { time: '6:00 PM', place: t('datePlanner.itinerary.dinner'), icon: '🌆' },
                    { time: '8:00 PM', place: t('datePlanner.itinerary.nightcap'), icon: '🍸' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{item.time}</p>
                        <p className="text-stone-500 text-xs">{item.place}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partners & Sources */}
        <section className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-sand">
          <div className="text-center mb-10">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-4">
              {t('partners.title')}
            </h3>
            <p className="text-stone-600">
              {t('partners.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'City of Fayetteville', url: 'https://www.fayettevillenc.gov', descKey: 'cityOfFayetteville' },
              { name: 'Cool Spring Downtown District', url: 'https://visitdowntownfayetteville.com', descKey: 'coolSpring' },
              { name: 'Distinctly Fayetteville', url: 'https://www.distinctlyfayettevillenc.com', descKey: 'distinctlyFayetteville' },
              { name: 'Fayetteville History Museum', url: 'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum', descKey: 'historyMuseum' },
              { name: 'Fort Bragg MWR', url: 'https://bragg.armymwr.com', descKey: 'fortBragg' },
              { name: 'Greater Fayetteville Chamber', url: 'https://www.faybiz.com', descKey: 'chamber' },
              { name: 'The Arts Council', url: 'https://www.wearethearts.com', descKey: 'artsCouncil' },
            ].map((org) => (
              <a
                key={org.name}
                href={org.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-4 rounded-xl bg-sand/30 hover:bg-sand/60 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden p-2">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${org.url}&sz=64`}
                    alt={`${org.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-brick transition-colors flex items-center gap-2">
                    {org.name}
                    <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-sm text-stone-600">{t(`partners.organizations.${org.descKey}`)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Open Source & Community */}
        <section className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-8 md:p-12 text-white text-center">
          <h3 className="font-display text-2xl font-bold mb-4">
            {t('openSource.title')}
          </h3>
          <p className="text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('openSource.description') }} />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/gitayam/Downtown-Guide"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/20 flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t('openSource.viewSource')}
            </a>
            <a
              href="https://discord.gg/gnq73U54jK"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              {t('openSource.contactDiscord')}
            </a>
          </div>
        </section>

        {/* Features & Benefits */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<CalendarDaysIcon className="w-8 h-8" />}
            title={t('features.sync.title')}
            desc={t('features.sync.description')}
          />
          <FeatureCard
            icon={<DevicePhoneMobileIcon className="w-8 h-8" />}
            title={t('features.mobile.title')}
            desc={t('features.mobile.description')}
          />
          <FeatureCard
            icon={<BuildingStorefrontIcon className="w-8 h-8" />}
            title={t('features.local.title')}
            desc={t('features.local.description')}
          />
        </section>

        {/* Credit */}
        <section className="text-center pt-12 border-t border-sand">
          <p className="text-stone-500 mb-2">{t('credit.madeBy')}</p>
          <a
            href="https://alfaren.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-brick transition-colors"
          >
            Alfaren LLC
            <ArrowRightIcon className="w-5 h-5" />
          </a>
        </section>

        {/* CTA */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="px-8 py-4 bg-brick text-white font-bold rounded-full shadow-lg hover:bg-brick-600 transition-all hover:scale-105 flex items-center gap-3"
          >
            {t('cta.exploreEvents')}
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-sand shadow-sm hover:shadow-md transition-shadow">
      <div className="w-14 h-14 bg-brick/10 text-brick rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-xl text-gray-900 mb-3">{title}</h3>
      <p className="text-stone-600 leading-relaxed">
        {desc}
      </p>
    </div>
  )
}
