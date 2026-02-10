import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations, Language, TranslationKey } from '../constants/translations';

const LANGUAGE_KEY = '@app_language';

// Global language state for components that can't use hooks
let globalLanguage: Language = 'de';
let globalListeners: ((lang: Language) => void)[] = [];

export const getGlobalLanguage = () => globalLanguage;
export const subscribeToLanguage = (listener: (lang: Language) => void) => {
  globalListeners.push(listener);
  return () => {
    globalListeners = globalListeners.filter(l => l !== listener);
  };
};

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(globalLanguage);

  useEffect(() => {
    // Load saved language on mount
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang === 'en' || savedLang === 'de') {
          setLanguageState(savedLang);
          globalLanguage = savedLang;
        } else {
          // Get device language if no saved preference
          const deviceLocales = Localization.getLocales();
          if (deviceLocales && deviceLocales.length > 0) {
            const deviceLang = deviceLocales[0].languageCode;
            const lang: Language = deviceLang === 'en' ? 'en' : 'de';
            setLanguageState(lang);
            globalLanguage = lang;
          }
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadLanguage();
    
    // Subscribe to language changes from other components
    const unsubscribe = subscribeToLanguage((lang) => {
      setLanguageState(lang);
    });
    
    return unsubscribe;
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
      globalLanguage = lang;
      // Notify all listeners
      globalListeners.forEach(listener => listener(lang));
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language]?.[key] || translations.de[key] || key;
  }, [language]);

  const switchLanguage = useCallback(() => {
    const newLang: Language = language === 'de' ? 'en' : 'de';
    setLanguage(newLang);
  }, [language, setLanguage]);

  return { language, t, switchLanguage, setLanguage };
}
