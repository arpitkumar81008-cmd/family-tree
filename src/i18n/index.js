import en from './en.js';
import hi from './hi.js';

export const DICTIONARIES = { en, hi };

export function createTranslator(lang = 'en') {
  const currentDict = DICTIONARIES[lang] || DICTIONARIES.en;
  return (key, ...args) => {
    const val = currentDict[key] ?? DICTIONARIES.en[key] ?? key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return val;
  };
}

export default DICTIONARIES;
