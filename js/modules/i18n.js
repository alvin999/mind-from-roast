import { TRANSLATIONS } from '../translations.js';
import { state } from './state.js';

export async function loadDailyQuotes() {
    try {
        const response = await fetch('data/daily_quotes.json');
        if (response.ok) {
            state.dailyAIQuotes = await response.json();
        }
    } catch (e) {
        console.log("Daily quotes not found, using fallbacks.");
    }
}

export function detectLanguage() {
    const savedLang = localStorage.getItem('muda_lang');
    if (savedLang && TRANSLATIONS[savedLang]) return savedLang;

    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
    if (navLang.startsWith('ja')) return 'ja';
    return 'en';
}

export function changeLanguageState(lang) {
    if (!TRANSLATIONS[lang]) return false;
    state.currentLang = lang;
    localStorage.setItem('muda_lang', lang);
    return true;
}

export function t(key, params = {}) {
    if (!TRANSLATIONS[state.currentLang]) state.currentLang = 'en';
    const translation = TRANSLATIONS[state.currentLang][key];
    if (!translation) return key;
    
    if (typeof translation === 'string') {
        let text = translation;
        for (const [pKey, pVal] of Object.entries(params)) {
            text = text.replace(`{${pKey}}`, pVal);
        }
        return text;
    }
    return translation;
}
