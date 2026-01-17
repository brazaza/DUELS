// ============================================
// i18n (Internationalization) Module
// ============================================

import ruTranslations from './ru.json';
import enTranslations from './en.json';

export type Language = 'ru' | 'en';

type TranslationObject = typeof ruTranslations;

const translations: Record<Language, TranslationObject> = {
    ru: ruTranslations,
    en: enTranslations,
};

// Get nested value from object by dot notation
function getNestedValue(obj: unknown, path: string): string {
    return path.split('.').reduce((acc: unknown, key: string) => {
        if (acc && typeof acc === 'object') {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj) as string;
}

// Current language storage
let currentLanguage: Language = 'ru';

// Detect browser language
export function detectLanguage(): Language {
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'ru' ? 'ru' : 'en';
}

// Get current language
export function getLanguage(): Language {
    return currentLanguage;
}

// Set current language
export function setLanguage(lang: Language): void {
    currentLanguage = lang;
    localStorage.setItem('duels-lang', lang);
}

// Initialize language from storage or browser
export function initLanguage(): Language {
    const storedLang = localStorage.getItem('duels-lang') as Language | null;
    if (storedLang && (storedLang === 'ru' || storedLang === 'en')) {
        currentLanguage = storedLang;
    } else {
        currentLanguage = detectLanguage();
    }
    return currentLanguage;
}

// Translate function
export function t(key: string, params?: Record<string, string | number>): string {
    const value = getNestedValue(translations[currentLanguage], key);

    if (!value) {
        console.warn(`Translation not found: ${key}`);
        return key;
    }

    // Replace placeholders like {{name}}
    if (params) {
        return Object.entries(params).reduce(
            (text, [paramKey, paramValue]) =>
                text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
            value
        );
    }

    return value;
}

// Export for React
export { translations };
