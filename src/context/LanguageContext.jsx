import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext(null);

const LANG_KEY = 'ocean-movies-lang';

function loadMessages(lang) {
  try {
    if (lang === 'ar') {
      return import('../locales/ar.json').then(m => m.default || m);
    }
    return import('../locales/en.json').then(m => m.default || m);
  } catch {
    return {};
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(LANG_KEY) || 'en';
  });
  const [messages, setMessages] = useState({});

  useEffect(() => {
    loadMessages(lang).then(setMessages);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLanguage = useCallback((l) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === 'en' ? 'ar' : 'en');
  }, [lang, setLanguage]);

  const t = useCallback((key, fallback) => {
    return messages[key] || fallback || key;
  }, [messages]);

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
