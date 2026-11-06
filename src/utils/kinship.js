/**
 * Traditional Indian Kinship Terminology & Relationship Resolver.
 * Computes exact culturally nuanced terms (e.g. Tauji vs Chacha, Bua, Mausi, Mama, Jethani, Devrani).
 */

export const HINDI_REL_NAMES = {
  You: "आप",
  Patni: "पत्नी",
  Pati: "पति",
  Papa: "पिताजी",
  Mummy: "माताजी",
  Beta: "बेटा",
  Beti: "बेटी",
  Bhaiya: "भैया",
  Bhai: "भाई",
  Didi: "दीदी",
  Behen: "बहन",
  Dadaji: "दादाजी",
  Nanaji: "नानाजी",
  Dadi: "दादीजी",
  Nani: "नानीजी",
  Pota: "पोता",
  Poti: "पोती",
  Damad: "दामाद",
  Bahu: "बहू",
  Tauji: "ताऊजी",
  Chacha: "चाचाजी",
  Mama: "मामाजी",
  Bua: "बुआजी",
  Mausi: "मौसीजी",
  Tai: "ताईजी",
  Chachi: "चाचीजी",
  Mami: "मामीजी",
  Phupha: "फूफाजी",
  Mausa: "मौसाजी",
  "Tayera Bhai": "चचेरा भाई",
  "Chachera Bhai": "चचेरा भाई",
  "Cousin Bhai": "चचेरा भाई",
  "Tayera Behen": "चचेरी बहन",
  "Chachera Behen": "चचेरी बहन",
  "Cousin Behen": "चचेरी बहन",
  Bhatija: "भतीजा",
  Bhatiji: "भतीजी",
  Bhanja: "भांजा",
  Bhanji: "भांजी",
  Bhabhi: "भाभीजी",
  Sasurji: "ससुरजी",
  Saas: "सासुजी",
  Jeth: "जेठ",
  Devar: "देवर",
  Nanad: "ननद",
  Jethani: "जेठानी",
  Devrani: "देवरानी",
  Pardada: "परदादाजी",
  Pardadi: "परदादीजी",
  Parnana: "परनानाजी",
  Parnani: "परनानीजी",
  Sala: "सालाजी",
  Sali: "सालीजी",
  Jija: "जीजाजी",
  Parpota: "पड़पोता",
  Parpoti: "पड़पोती",
  Relative: "रिश्तेदार"
};

export const HINDI_REL_DESCRIPTIONS = {
  "This is you": "यह आप हैं",
  Wife: "पत्नी",
  Husband: "पति",
  Father: "पिता",
  Mother: "माता",
  Son: "पुत्र",
  Daughter: "पुत्री",
  "Elder brother": "बड़े भाई",
  "Younger brother": "छोटे भाई",
  "Elder sister": "बड़ी बहन",
  "Younger sister": "छोटी बहन",
  "Paternal grandfather": "दादा (पिता के पिता)",
  "Maternal grandfather": "नाना (माता के पिता)",
  "Paternal grandmother": "दादी (पिता की माता)",
  "Maternal grandmother": "नानी (माता की माता)",
  Grandson: "पोता",
  Granddaughter: "पोती",
  "Son-in-law": "दामाद",
  "Daughter-in-law": "बहू",
  "Father's elder brother": "पिता के बड़े भाई",
  "Father's younger brother": "पिता के छोटे भाई",
  "Mother's brother": "माता के भाई",
  "Father's sister": "पिता की बहन",
  "Mother's sister": "माता की बहन",
  "Tauji's wife": "ताऊजी की पत्नी",
  "Chacha's wife": "चाचा की पत्नी",
  "Mama's wife": "मामा की पत्नी",
  "Bua's husband": "बुआ के पति",
  "Mausi's husband": "मौसी के पति",
  "Cousin brother (Tauji's son)": "ताऊजी का बेटा",
  "Cousin brother (Chacha's son)": "चाचा का बेटा",
  "Cousin brother": "चचेरा भाई",
  "Cousin sister (Tauji's daughter)": "ताऊजी की बेटी",
  "Cousin sister (Chacha's daughter)": "चाचा की बेटी",
  "Cousin sister": "चचेरी बहन",
  "Brother's son": "भाई का बेटा",
  "Brother's daughter": "भाई की बेटी",
  "Sister's son": "बहन का बेटा",
  "Sister's daughter": "बहन की बेटी",
  "Elder brother's wife": "बड़े भाई की पत्नी",
  "Younger brother's wife": "छोटे भाई की पत्नी",
  "Father-in-law": "ससुर",
  "Mother-in-law": "सास",
  "Husband's elder brother": "पति के बड़े भाई",
  "Husband's younger brother": "पति के छोटे भाई",
  "Husband's sister": "पति की बहन",
  "Husband's elder brother's wife": "पति के बड़े भाई की पत्नी",
  "Husband's younger brother's wife": "पति के छोटे भाई की पत्नी",
  "Husband's brother's son": "पति के भाई का बेटा",
  "Husband's brother's daughter": "पति के भाई की बेटी",
  "Paternal great-grandfather": "परदादा (दादा के पिता)",
  "Paternal great-grandmother": "परदादी (दादा की माता)",
  "Maternal great-grandfather": "परनाना (नाना के पिता)",
  "Maternal great-grandmother": "परनानी (नानी की माता)",
  "Wife's brother": "साला (पत्नी का भाई)",
  "Wife's sister": "साली (पत्नी की बहन)",
  "Sister's husband": "जीजा (बहन के पति)",
  "Great-grandson": "पड़पोता",
  "Great-granddaughter": "पड़पोती",
  "Family member": "परिवार के सदस्य"
};

/**
 * Calculates relation of target person relative to origin person.
 * Returns [shortLabel, description].
 */
export function calculateKinship(familyIndex, originId, targetId, lang = "en") {
  const { spouse, kidsOf, parOf, sibsOf, male, elder } = familyIndex;

  function computeRawRelation(t, n) {
    if (t === n) return ["You", "This is you"];

    const s = spouse[t];
    const c = parOf(t)[0];

    // Spouse
    if (s === n) return male(t) ? ["Patni", "Wife"] : ["Pati", "Husband"];

    // Direct parents
    if (parOf(t).includes(n)) return male(n) ? ["Papa", "Father"] : ["Mummy", "Mother"];

    // Direct children
    if (kidsOf(t).includes(n)) return male(n) ? ["Beta", "Son"] : ["Beti", "Daughter"];

    // Siblings
    if (sibsOf(t).includes(n)) {
      const isElder = elder(n, t);
      return male(n)
        ? isElder ? ["Bhaiya", "Elder brother"] : ["Bhai", "Younger brother"]
        : isElder ? ["Didi", "Elder sister"] : ["Behen", "Younger sister"];
    }

    // Grandparents
    for (const p of parOf(t)) {
      if (parOf(p).includes(n)) {
        const isPat = p === c;
        if (male(n)) {
          return isPat ? ["Dadaji", "Paternal grandfather"] : ["Nanaji", "Maternal grandfather"];
        }
        return isPat ? ["Dadi", "Paternal grandmother"] : ["Nani", "Maternal grandmother"];
      }
    }

    // Great-grandparents
    for (const p of parOf(t)) {
      for (const gp of parOf(p)) {
        if (parOf(gp).includes(n)) {
          const isPat = p === c;
          if (male(n)) {
            return isPat ? ["Pardada", "Paternal great-grandfather"] : ["Parnana", "Maternal great-grandfather"];
          }
          return isPat ? ["Pardadi", "Paternal great-grandmother"] : ["Parnani", "Maternal great-grandmother"];
        }
      }
    }

    // Grandchildren & in-law kids
    for (const child of kidsOf(t)) {
      if (kidsOf(child).includes(n)) {
        return male(n) ? ["Pota", "Grandson"] : ["Poti", "Granddaughter"];
      }
      if (spouse[child] === n) {
        return male(n) ? ["Damad", "Son-in-law"] : ["Bahu", "Daughter-in-law"];
      }
    }

    // Aunts / Uncles / Cousins (via parents' siblings)
    for (const p of parOf(t)) {
      const isPat = p === c;
      for (const sib of sibsOf(p)) {
        const isElderUncle = elder(sib, p);

        // Uncle / Aunt
        if (sib === n) {
          if (male(n)) {
            return isPat
              ? isElderUncle ? ["Tauji", "Father's elder brother"] : ["Chacha", "Father's younger brother"]
              : ["Mama", "Mother's brother"];
          }
          return isPat ? ["Bua", "Father's sister"] : ["Mausi", "Mother's sister"];
        }

        // Uncle / Aunt's spouse
        if (spouse[sib] === n) {
          if (male(sib)) {
            return isPat
              ? isElderUncle ? ["Tai", "Tauji's wife"] : ["Chachi", "Chacha's wife"]
              : ["Mami", "Mama's wife"];
          }
          return isPat ? ["Phupha", "Bua's husband"] : ["Mausa", "Mausi's husband"];
        }

        // Cousins
        if (kidsOf(sib).includes(n)) {
          const isPatUncle = isPat && male(sib);
          const prefix = isPatUncle ? (isElderUncle ? "Tayera" : "Chachera") : "Cousin";
          const subNote = isPatUncle ? (isElderUncle ? "Tauji's" : "Chacha's") : "";
          return male(n)
            ? [prefix + " Bhai", "Cousin brother" + (subNote ? ` (${subNote} son)` : "")]
            : [prefix + " Behen", "Cousin sister" + (subNote ? ` (${subNote} daughter)` : "")];
        }
      }
    }

    // Nieces & Nephews (via siblings)
    for (const sib of sibsOf(t)) {
      if (kidsOf(sib).includes(n)) {
        if (male(sib)) {
          return male(n) ? ["Bhatija", "Brother's son"] : ["Bhatiji", "Brother's daughter"];
        }
        return male(n) ? ["Bhanja", "Sister's son"] : ["Bhanji", "Sister's daughter"];
      }
      if (spouse[sib] === n && male(sib)) {
        return ["Bhabhi", elder(sib, t) ? "Elder brother's wife" : "Younger brother's wife"];
      }
    }

    // In-Laws (via spouse)
    if (s) {
      if (parOf(s).includes(n)) {
        return male(n) ? ["Sasurji", "Father-in-law"] : ["Saas", "Mother-in-law"];
      }
      if (male(t)) {
        // Husband's perspective on Wife's siblings
        for (const sib of sibsOf(s)) {
          if (sib === n) return male(n) ? ["Sala", "Wife's brother"] : ["Sali", "Wife's sister"];
        }
      } else {
        // Wife's perspective on Husband's siblings
        for (const sib of sibsOf(s)) {
          const isElderBrother = elder(sib, s);
          if (sib === n) {
            return male(n)
              ? isElderBrother ? ["Jeth", "Husband's elder brother"] : ["Devar", "Husband's younger brother"]
              : ["Nanad", "Husband's sister"];
          }
          if (spouse[sib] === n) {
            return isElderBrother
              ? ["Jethani", "Husband's elder brother's wife"]
              : ["Devrani", "Husband's younger brother's wife"];
          }
          if (kidsOf(sib).includes(n)) {
            return male(n)
              ? ["Bhatija", "Husband's brother's son"]
              : ["Bhatiji", "Husband's brother's daughter"];
          }
        }
      }
    }

    return ["Relative", "Family member"];
  }

  const raw = computeRawRelation(originId, targetId);
  if (lang === "hi") {
    return [
      HINDI_REL_NAMES[raw[0]] || raw[0],
      HINDI_REL_DESCRIPTIONS[raw[1]] || raw[1]
    ];
  }
  return raw;
}
