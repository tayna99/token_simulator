import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from '../public/locales/en/translation.json'
import koTranslation from '../public/locales/ko/translation.json'

const resources = {
  en: { translation: enTranslation },
  ko: { translation: koTranslation },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
