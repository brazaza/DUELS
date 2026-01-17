// ============================================
// useTranslation Hook
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { t, getLanguage, setLanguage, initLanguage, Language } from '../i18n';

export function useTranslation() {
    const [lang, setLang] = useState<Language>(() => initLanguage());

    // Re-render when language changes
    const [, forceUpdate] = useState({});

    useEffect(() => {
        // Listen for storage changes (other tabs)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'duels-lang' && e.newValue) {
                setLang(e.newValue as Language);
                forceUpdate({});
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const switchLanguage = useCallback((newLang: Language) => {
        setLanguage(newLang);
        setLang(newLang);
        forceUpdate({});
    }, []);

    const toggleLanguage = useCallback(() => {
        const newLang = getLanguage() === 'ru' ? 'en' : 'ru';
        switchLanguage(newLang);
    }, [switchLanguage]);

    return {
        t,
        lang,
        setLang: switchLanguage,
        toggleLang: toggleLanguage,
    };
}
