import { useState, useEffect } from 'react';
import * as Localization from 'expo-localization';
import { translations, Language, TranslationKey } from '../constants/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('de');

  useEffect(() => {
    // Get device language
    const deviceLocales = Localization.getLocales();
    if (deviceLocales && deviceLocales.length > 0) {
      const deviceLang = deviceLocales[0].languageCode;
      // Default to German unless English is specifically detected
      if (deviceLang === 'en') {
        setLanguage('en');
      } else {
        setLanguage('de');
      }
    }
  }, []);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.de[key] || key;
  };

  const switchLanguage = () => {
    setLanguage(prev => prev === 'de' ? 'en' : 'de');
  };

  return { language, t, switchLanguage, setLanguage };
}
