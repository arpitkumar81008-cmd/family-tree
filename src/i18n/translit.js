/**
 * Dual-engine phonetic English-to-Hindi transliteration.
 * 1. Primary: Google Input Tools API (hi-t-i0-und)
 * 2. Fallback: Robust local dictionary and rule-based phonetic engine.
 */

const OFFLINE_NAMES = {
  sharma: "शर्मा",
  verma: "वर्मा",
  kumar: "कुमार",
  kumari: "कुमारी",
  devi: "देवी",
  singh: "सिंह",
  patel: "पटेल",
  joshi: "जोशी",
  mehta: "मेहता",
  ram: "राम",
  dayal: "दयाल",
  shri: "श्री",
  shrimati: "श्रीमती",
  late: "स्व.",
  hari: "हरि",
  om: "ओम",
  narayan: "नारायण",
  aarav: "आरव",
  vivaan: "विवान",
  aditya: "आदित्य",
  kabir: "कबीर",
  rohan: "रोहन",
  aryan: "आर्यन",
  arjun: "अर्जुन",
  vikram: "विक्रम",
  diya: "दिया",
  ananya: "अनन्या",
  kavya: "काव्या",
  meera: "मीरा",
  isha: "ईशा",
  siya: "सिया",
  priya: "प्रिया",
  amit: "अमित",
  sumit: "सुमित",
  rohit: "रोहित",
  neha: "नेहा",
  pooja: "पूजा",
  raj: "राज",
  rahul: "राहुल",
  vikas: "विकास",
  sunita: "सुनीता",
  anita: "अनीता",
  rekha: "रेखा",
  sanjay: "संजय",
  manoj: "मनोज",
  ajay: "अजय",
  vijay: "विजय",
  deepak: "दीपक"
};

const MATRAS = {
  aa: "ा",
  ai: "ै",
  au: "ौ",
  ee: "ी",
  oo: "ू",
  a: "",
  i: "ि",
  u: "ु",
  e: "े",
  o: "ो"
};

const INDEPENDENT_VOWELS = {
  aa: "आ",
  ai: "ऐ",
  au: "औ",
  ee: "ई",
  oo: "ऊ",
  a: "अ",
  i: "इ",
  u: "उ",
  e: "ए",
  o: "ओ"
};

const CONSONANTS = {
  kh: "ख",
  gh: "घ",
  chh: "छ",
  ch: "च",
  jh: "झ",
  th: "थ",
  dh: "ध",
  bh: "भ",
  sh: "श",
  ph: "फ",
  k: "क",
  g: "ग",
  j: "ज",
  t: "त",
  d: "द",
  n: "न",
  p: "प",
  b: "ब",
  m: "म",
  y: "य",
  r: "र",
  l: "ल",
  v: "व",
  w: "व",
  s: "स",
  h: "ह"
};

export function translitOffline(input = "") {
  if (!input) return "";
  const tokens = input.trim().split(/\s+/);

  return tokens
    .map(token => {
      const lower = token.toLowerCase();
      if (OFFLINE_NAMES[lower]) return OFFLINE_NAMES[lower];

      let result = "";
      let i = 0;
      const s = lower;

      while (i < s.length) {
        // 3-char consonant check (e.g. chh)
        if (i + 3 <= s.length && CONSONANTS[s.slice(i, i + 3)]) {
          const char = CONSONANTS[s.slice(i, i + 3)];
          i += 3;
          let matchedVowel = false;
          for (const len of [2, 1]) {
            const v = s.slice(i, i + len);
            if (MATRAS[v] !== undefined) {
              result += char + MATRAS[v];
              i += len;
              matchedVowel = true;
              break;
            }
          }
          if (!matchedVowel) {
            result += i < s.length && s[i] !== " " ? char + "्" : char;
          }
          continue;
        }

        // 2-char consonant check (e.g. kh, gh, sh, ch)
        if (i + 2 <= s.length && CONSONANTS[s.slice(i, i + 2)]) {
          const char = CONSONANTS[s.slice(i, i + 2)];
          i += 2;
          let matchedVowel = false;
          for (const len of [2, 1]) {
            const v = s.slice(i, i + len);
            if (MATRAS[v] !== undefined) {
              result += char + MATRAS[v];
              i += len;
              matchedVowel = true;
              break;
            }
          }
          if (!matchedVowel) {
            result += i < s.length && s[i] !== " " ? char + "्" : char;
          }
          continue;
        }

        // 1-char consonant check
        if (CONSONANTS[s[i]]) {
          const char = CONSONANTS[s[i]];
          i++;
          let matchedVowel = false;
          for (const len of [2, 1]) {
            const v = s.slice(i, i + len);
            if (MATRAS[v] !== undefined) {
              result += char + MATRAS[v];
              i += len;
              matchedVowel = true;
              break;
            }
          }
          if (!matchedVowel) {
            result += i < s.length && s[i] !== " " ? char + "्" : char;
          }
          continue;
        }

        // Independent vowels
        let matchedIndep = false;
        for (const len of [2, 1]) {
          const v = s.slice(i, i + len);
          if (INDEPENDENT_VOWELS[v] !== undefined) {
            result += INDEPENDENT_VOWELS[v];
            i += len;
            matchedIndep = true;
            break;
          }
        }
        if (!matchedIndep) {
          result += s[i];
          i++;
        }
      }
      return result;
    })
    .join(" ");
}

export async function transliterateToHindi(input = "") {
  if (!input || !input.trim()) return "";
  const trimmed = input.trim();
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
  try {
    const res = await fetch(
      "https://inputtools.google.com/request?text=" +
        encodeURIComponent(trimmed) +
        "&itc=hi-t-i0-und&num=1",
      controller ? { signal: controller.signal } : undefined
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
        return data[1][0][1][0];
      }
    }
  } catch {
    // Network or timeout fallback
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  return translitOffline(trimmed);
}
