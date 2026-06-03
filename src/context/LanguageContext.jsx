import { createContext, useContext, useState, useCallback } from 'react';
import i18n from 'i18next';

const LanguageContext = createContext();

const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const DEFAULT_LANGUAGE = 'es';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('pico_language') || DEFAULT_LANGUAGE;
    i18n.changeLanguage(saved);
    return saved;
  });

  const setLanguage = useCallback((lang) => {
    localStorage.setItem('pico_language', lang);
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

/**
 * Get the display content for an element based on the active language.
 * Falls back to the default (Spanish) content if no translation exists.
 */
export const getTranslatedContent = (element, language) => {
  if (!element || language === DEFAULT_LANGUAGE) return element?.content;
  return element?.translations?.[language]?.content || element?.content;
};

/**
 * Get the translated quiz options based on the active language.
 * Falls back to the default (Spanish) options if no translation exists.
 */
export const getTranslatedOptions = (metadata, language) => {
  if (!metadata || language === DEFAULT_LANGUAGE) return metadata?.options;
  return metadata?.translations?.[language]?.options || metadata?.options;
};

export default LanguageContext;
