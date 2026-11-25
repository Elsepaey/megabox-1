import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

// Staff dashboard strings live in src/locales/admin/<area>.<lang>.json, each
// holding its own top-level namespaces, merged over the base dictionaries.
const adminLocaleModules = import.meta.glob('../locales/admin/*.json', { eager: true, import: 'default' });

function mergeAdminLocales(base, lang) {
  const merged = { ...base };
  Object.entries(adminLocaleModules).forEach(([path, dict]) => {
    if (!path.endsWith(`.${lang}.json`)) return;
    Object.entries(dict).forEach(([ns, value]) => {
      merged[ns] = { ...(merged[ns] || {}), ...value };
    });
  });
  return merged;
}

const dictionaries = {
  en: mergeAdminLocales(enTranslations, 'en'),
  ar: mergeAdminLocales(arTranslations, 'ar'),
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [cookies, setCookie] = useCookies(['language']);

  useEffect(() => {
    // Get language from cookie, or default to 'en'
    const savedLanguage = cookies.language || 'en';
    
    setLanguage(savedLanguage);
    setCookie('language', savedLanguage, { path: '/', maxAge: 365 * 24 * 60 * 60 }); // 1 year
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLanguage;
  }, [cookies.language, setCookie]);

  const changeLanguage = (lang) => {
    if (lang === language) return; // Don't update if same language
    
    setLanguage(lang);
    setCookie('language', lang, { path: '/', maxAge: 365 * 24 * 60 * 60 }); // 1 year
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    const translations = language === 'ar' ? dictionaries.ar : dictionaries.en;
    let value = translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }

    if (typeof value !== 'string') return value || key;

    // Handle interpolation (replace {{variable}} with actual values)
    let result = value;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g');
        result = result.replace(regex, params[paramKey]);
      });
      
      // Handle pluralization for count parameter
      if (params.count !== undefined) {
        const count = Number(params.count);
        // Check if there's a plural version of the key (append 'Plural' to the last key segment)
        const keyParts = key.split('.');
        const lastKey = keyParts[keyParts.length - 1];
        const pluralLastKey = lastKey + 'Plural';
        const pluralKeyParts = [...keyParts.slice(0, -1), pluralLastKey];
        
        // Try to get the plural value
        let pluralValue = translations;
        for (const k of pluralKeyParts) {
          pluralValue = pluralValue?.[k];
          if (pluralValue === undefined) break;
        }
        
        // If plural key exists and count is not 1, use plural form
        if (pluralValue !== undefined && typeof pluralValue === 'string' && count !== 1) {
          result = pluralValue;
          // Replace count in plural form too
          Object.keys(params).forEach(paramKey => {
            const regex = new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g');
            result = result.replace(regex, params[paramKey]);
          });
        }
        // If count is 1, the singular form (already in result) is correct
      }
    }

    return result || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default values if context is not available
    return {
      language: 'en',
      changeLanguage: () => { },
      t: (key) => key
    };
  }
  return context;
};

