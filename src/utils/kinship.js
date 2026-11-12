/**
 * Traditional Indian Kinship Terminology & Complex Relationship Solver.
 * Computes culturally nuanced Indian kinship terms, arbitrary N-hop LCA blood
 * relations (2nd/3rd cousins, once/twice removed, grand-uncles/aunts, multi-gen
 * ancestors/descendants), and shortest-path BFS across parent/child/spouse edges.
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
  Nati: "नाती",
  Natin: "नातिन",
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
  "Tayera Bhai": "तयेरा भाई",
  "Chachera Bhai": "चचेरा भाई",
  "Mamera Bhai": "ममेरा भाई",
  "Mausera Bhai": "मौसेरा भाई",
  "Phuphera Bhai": "फुफेरा भाई",
  "Cousin Bhai": "चचेरा भाई",
  "Tayera Behen": "तयेरी बहन",
  "Chachera Behen": "चचेरी बहन",
  "Mamera Behen": "ममेरी बहन",
  "Mausera Behen": "मौसेरी बहन",
  "Phuphera Behen": "फुफेरी बहन",
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
  Nandoi: "नंदोई",
  Sadhu: "साढू",
  Samdhi: "समधी",
  Samdhan: "समधन",
  Pardada: "परदादाजी",
  Pardadi: "परदादीजी",
  Parnana: "परनानाजी",
  Parnani: "परनानीजी",
  Sala: "सालाजी",
  Sali: "सालीजी",
  Jija: "जीजाजी",
  Parpota: "पड़पोता",
  Parpoti: "पड़पोती",
  "Dada-Sasur": "दादा-ससुर",
  "Dadi-Saas": "दादी-सास",
  "Nana-Sasur": "नाना-ससुर",
  "Nani-Saas": "नानी-सास",
  Relative: "रिश्तेदार",
  "Not Related": "कोई सीधा संबंध नहीं"
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
  "Grandson (son's son)": "पोता (बेटे का बेटा)",
  "Granddaughter (son's daughter)": "पोती (बेटे की बेटी)",
  "Grandson (daughter's son)": "नाती (बेटी का बेटा)",
  "Granddaughter (daughter's daughter)": "नातिन (बेटी की बेटी)",
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
  "Cousin brother (Mama's son)": "मामाजी का बेटा",
  "Cousin brother (Mausi's son)": "मौसीजी का बेटा",
  "Cousin brother (Bua's son)": "बुआजी का बेटा",
  "Cousin brother": "चचेरा भाई",
  "Cousin sister (Tauji's daughter)": "ताऊजी की बेटी",
  "Cousin sister (Chacha's daughter)": "चाचा की बेटी",
  "Cousin sister (Mama's daughter)": "मामाजी की बेटी",
  "Cousin sister (Mausi's daughter)": "मौसीजी की बेटी",
  "Cousin sister (Bua's daughter)": "बुआजी की बेटी",
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
  "Husband's sister's husband": "पति की बहन के पति",
  "Wife's sister's husband": "पत्नी की बहन के पति",
  "Child's spouse's father": "बच्चे के ससुर (समधी)",
  "Child's spouse's mother": "बच्चे की सास (समधन)",
  "Paternal great-grandfather": "परदादा (दादा के पिता)",
  "Paternal great-grandmother": "परदादी (दादा की माता)",
  "Maternal great-grandfather": "परनाना (नाना के पिता)",
  "Maternal great-grandmother": "परनानी (नानी की माता)",
  "Wife's brother": "साला (पत्नी का भाई)",
  "Wife's sister": "साली (पत्नी की बहन)",
  "Sister's husband": "जीजा (बहन के पति)",
  "Great-grandson": "पड़पोता",
  "Great-granddaughter": "पड़पोती",
  "Spouse's paternal grandfather": "जीवनसाथी के दादा",
  "Spouse's paternal grandmother": "जीवनसाथी की दादी",
  "Spouse's maternal grandfather": "जीवनसाथी के नाना",
  "Spouse's maternal grandmother": "जीवनसाथी की नानी",
  "Family member": "परिवार के सदस्य",
  "No family connection found": "परिवार में कोई जुड़ाव नहीं मिला"
};

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function removedSuffixEn(r) {
  if (r <= 0) return "";
  if (r === 1) return " once removed";
  if (r === 2) return " twice removed";
  if (r === 3) return " thrice removed";
  return ` ${r} times removed`;
}

function edgeLabel(familyIndex, fromId, toId, edge, lang) {
  const isHi = lang === "hi";
  const isTargetMale = familyIndex.male(toId);
  if (edge === "parent") {
    return isTargetMale ? (isHi ? "पिता" : "Father") : (isHi ? "माता" : "Mother");
  }
  if (edge === "child") {
    return isTargetMale ? (isHi ? "बेटा" : "Son") : (isHi ? "बेटी" : "Daughter");
  }
  if (edge === "spouse") {
    return isTargetMale ? (isHi ? "पति" : "Husband") : (isHi ? "पत्नी" : "Wife");
  }
  return "";
}

function buildAncestorMap(familyIndex, startId) {
  const map = { [startId]: { depth: 0, path: [startId] } };
  const queue = [startId];
  while (queue.length > 0) {
    const curr = queue.shift();
    const { depth, path } = map[curr];
    for (const pid of familyIndex.parOf(curr)) {
      if (!(pid in map)) {
        map[pid] = { depth: depth + 1, path: [...path, pid] };
        queue.push(pid);
      }
    }
  }
  return map;
}

function findBestLCA(familyIndex, originId, targetId) {
  const ancOrigin = buildAncestorMap(familyIndex, originId);
  const ancTarget = buildAncestorMap(familyIndex, targetId);

  let best = null;
  for (const id of Object.keys(ancOrigin)) {
    if (!(id in ancTarget)) continue;
    const up = ancOrigin[id].depth;
    const down = ancTarget[id].depth;
    const total = up + down;
    const diff = Math.abs(up - down);
    const isMale = familyIndex.male(id) ? 0 : 1;

    if (
      !best ||
      total < best.total ||
      (total === best.total && diff < best.diff) ||
      (total === best.total && diff === best.diff && isMale < best.isMale)
    ) {
      best = {
        lcaId: id,
        upSteps: up,
        downSteps: down,
        total,
        diff,
        isMale,
        originPath: ancOrigin[id].path,
        targetPath: ancTarget[id].path
      };
    }
  }
  return best;
}

function buildBloodPathSteps(familyIndex, originPath, targetPath, lang) {
  const steps = [];
  for (let i = 0; i < originPath.length - 1; i++) {
    const fromId = originPath[i];
    const toId = originPath[i + 1];
    steps.push({
      fromId,
      toId,
      edge: "parent",
      relation: edgeLabel(familyIndex, fromId, toId, "parent", lang)
    });
  }
  const downNodes = [...targetPath].reverse();
  for (let i = 0; i < downNodes.length - 1; i++) {
    const fromId = downNodes[i];
    const toId = downNodes[i + 1];
    steps.push({
      fromId,
      toId,
      edge: "child",
      relation: edgeLabel(familyIndex, fromId, toId, "child", lang)
    });
  }
  return steps;
}

function findShortestBFSPath(familyIndex, originId, targetId, lang) {
  const visited = new Set([originId]);
  const queue = [{ id: originId, steps: [] }];

  while (queue.length > 0) {
    const { id, steps } = queue.shift();
    if (id === targetId) return steps;

    const neighbors = [];
    for (const pid of familyIndex.parOf(id)) {
      neighbors.push({ nextId: pid, edge: "parent" });
    }
    for (const cid of familyIndex.kidsOf(id)) {
      neighbors.push({ nextId: cid, edge: "child" });
    }
    const sid = familyIndex.spouse[id];
    if (sid) {
      neighbors.push({ nextId: sid, edge: "spouse" });
    }

    for (const { nextId, edge } of neighbors) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({
          id: nextId,
          steps: [
            ...steps,
            {
              fromId: id,
              toId: nextId,
              edge,
              relation: edgeLabel(familyIndex, id, nextId, edge, lang)
            }
          ]
        });
      }
    }
  }
  return null;
}

function localizePair(shortEn, descEn, lang) {
  if (lang === "hi") {
    return [
      HINDI_REL_NAMES[shortEn] || shortEn,
      HINDI_REL_DESCRIPTIONS[descEn] || descEn
    ];
  }
  return [shortEn, descEn];
}

function resolveBloodTerm(familyIndex, originId, targetId, lca, lang) {
  const { male, elder } = familyIndex;
  const { upSteps, downSteps, originPath, targetPath } = lca;
  const isTargetMale = male(targetId);
  const isHi = lang === "hi";

  const originParent = upSteps >= 1 ? originPath[1] : null;
  const isPat = originParent ? male(originParent) : false;

  // Direct ancestor / descendant
  if (upSteps === 1 && downSteps === 0) {
    const [s, d] = isTargetMale ? ["Papa", "Father"] : ["Mummy", "Mother"];
    return { ...formatPair(s, d, lang), lineageSide: "direct", degree: 1 };
  }
  if (upSteps === 0 && downSteps === 1) {
    const [s, d] = isTargetMale ? ["Beta", "Son"] : ["Beti", "Daughter"];
    return { ...formatPair(s, d, lang), lineageSide: "direct", degree: 1 };
  }
  if (upSteps === 1 && downSteps === 1) {
    const isElder = elder(targetId, originId);
    const [s, d] = isTargetMale
      ? (isElder ? ["Bhaiya", "Elder brother"] : ["Bhai", "Younger brother"])
      : (isElder ? ["Didi", "Elder sister"] : ["Behen", "Younger sister"]);
    return { ...formatPair(s, d, lang), lineageSide: "direct", degree: 1 };
  }

  // Grandparents (up=2, down=0)
  if (upSteps === 2 && downSteps === 0) {
    const [s, d] = isPat
      ? (isTargetMale ? ["Dadaji", "Paternal grandfather"] : ["Dadi", "Paternal grandmother"])
      : (isTargetMale ? ["Nanaji", "Maternal grandfather"] : ["Nani", "Maternal grandmother"]);
    return { ...formatPair(s, d, lang), lineageSide: isPat ? "paternal" : "maternal", degree: 2 };
  }

  // Grandchildren (up=0, down=2) — Pota/Poti (son's child) vs Nati/Natin (daughter's child)
  if (upSteps === 0 && downSteps === 2) {
    const viaChild = targetPath[1];
    const viaSon = male(viaChild);
    const [s, d] = viaSon
      ? (isTargetMale ? ["Pota", "Grandson (son's son)"] : ["Poti", "Granddaughter (son's daughter)"])
      : (isTargetMale ? ["Nati", "Grandson (daughter's son)"] : ["Natin", "Granddaughter (daughter's daughter)"]);
    return { ...formatPair(s, d, lang), lineageSide: viaSon ? "paternal" : "maternal", degree: 2 };
  }

  // Great-grandparents (up=3, down=0)
  if (upSteps === 3 && downSteps === 0) {
    const [s, d] = isPat
      ? (isTargetMale ? ["Pardada", "Paternal great-grandfather"] : ["Pardadi", "Paternal great-grandmother"])
      : (isTargetMale ? ["Parnana", "Maternal great-grandfather"] : ["Parnani", "Maternal great-grandmother"]);
    return { ...formatPair(s, d, lang), lineageSide: isPat ? "paternal" : "maternal", degree: 3 };
  }

  // Great-grandchildren (up=0, down=3)
  if (upSteps === 0 && downSteps === 3) {
    const [s, d] = isTargetMale ? ["Parpota", "Great-grandson"] : ["Parpoti", "Great-granddaughter"];
    return { ...formatPair(s, d, lang), lineageSide: "direct", degree: 3 };
  }

  // N-gen Ancestors (up > 3, down = 0)
  if (upSteps > 3 && downSteps === 0) {
    const greats = upSteps - 2;
    const sideEn = isPat ? "Paternal" : "Maternal";
    const baseEn = isTargetMale ? "grandfather" : "grandmother";
    const shortEn = `${greats}x ${isPat ? (isTargetMale ? "Pardada" : "Pardadi") : (isTargetMale ? "Parnana" : "Parnani")}`;
    const descEn = `${sideEn} ${"great-".repeat(greats)}${baseEn}`;
    const shortHi = `${greats}x ${isPat ? (isTargetMale ? "परदादाजी" : "परदादीजी") : (isTargetMale ? "परनानाजी" : "परनानीजी")}`;
    const descHi = `${isPat ? "पैतृक" : "मातृ"} ${greats} पीढ़ी पूर्व ${isTargetMale ? "दादा/नाना" : "दादी/नानी"}`;
    return {
      shortLabel: isHi ? shortHi : shortEn,
      description: isHi ? descHi : descEn,
      lineageSide: isPat ? "paternal" : "maternal",
      degree: upSteps
    };
  }

  // N-gen Descendants (up = 0, down > 3)
  if (upSteps === 0 && downSteps > 3) {
    const greats = downSteps - 2;
    const shortEn = `${greats}x ${isTargetMale ? "Parpota" : "Parpoti"}`;
    const descEn = `${"Great-".repeat(greats)}${isTargetMale ? "grandson" : "granddaughter"}`;
    const shortHi = `${greats}x ${isTargetMale ? "पड़पोता" : "पड़पोती"}`;
    const descHi = `${greats} पीढ़ी बाद के ${isTargetMale ? "पड़पोता" : "पड़पोती"}`;
    return {
      shortLabel: isHi ? shortHi : shortEn,
      description: isHi ? descHi : descEn,
      lineageSide: "direct",
      degree: downSteps
    };
  }

  // Uncles & Aunts (up=2, down=1)
  if (upSteps === 2 && downSteps === 1) {
    const isElderUncle = elder(targetId, originParent);
    let pair;
    if (isPat) {
      if (isTargetMale) {
        pair = isElderUncle ? ["Tauji", "Father's elder brother"] : ["Chacha", "Father's younger brother"];
      } else {
        pair = ["Bua", "Father's sister"];
      }
    } else {
      pair = isTargetMale ? ["Mama", "Mother's brother"] : ["Mausi", "Mother's sister"];
    }
    return { ...formatPair(pair[0], pair[1], lang), lineageSide: isPat ? "paternal" : "maternal", degree: 1 };
  }

  // Nieces & Nephews (up=1, down=2)
  if (upSteps === 1 && downSteps === 2) {
    const sib = targetPath[1];
    const pair = male(sib)
      ? (isTargetMale ? ["Bhatija", "Brother's son"] : ["Bhatiji", "Brother's daughter"])
      : (isTargetMale ? ["Bhanja", "Sister's son"] : ["Bhanji", "Sister's daughter"]);
    return { ...formatPair(pair[0], pair[1], lang), lineageSide: "direct", degree: 1 };
  }

  // 1st Cousins (up=2, down=2)
  if (upSteps === 2 && downSteps === 2) {
    const targetParent = targetPath[1];
    const side = isPat ? "paternal" : "maternal";
    let pair;
    if (isPat) {
      if (male(targetParent)) {
        const isElderUncle = elder(targetParent, originParent);
        const prefix = isElderUncle ? "Tayera" : "Chachera";
        const subNote = isElderUncle ? "Tauji's" : "Chacha's";
        pair = isTargetMale
          ? [`${prefix} Bhai`, `Cousin brother (${subNote} son)`]
          : [`${prefix} Behen`, `Cousin sister (${subNote} daughter)`];
      } else {
        pair = isTargetMale
          ? ["Phuphera Bhai", "Cousin brother (Bua's son)"]
          : ["Phuphera Behen", "Cousin sister (Bua's daughter)"];
      }
    } else {
      if (male(targetParent)) {
        pair = isTargetMale
          ? ["Mamera Bhai", "Cousin brother (Mama's son)"]
          : ["Mamera Behen", "Cousin sister (Mama's daughter)"];
      } else {
        pair = isTargetMale
          ? ["Mausera Bhai", "Cousin brother (Mausi's son)"]
          : ["Mausera Behen", "Cousin sister (Mausi's daughter)"];
      }
    }
    return { ...formatPair(pair[0], pair[1], lang), lineageSide: side, degree: 1 };
  }

  // Grand-uncles / Grand-aunts & N-th Great-uncles/aunts (up >= 3, down = 1)
  if (upSteps >= 3 && downSteps === 1) {
    const greats = upSteps - 3;
    const side = isPat ? "paternal" : "maternal";
    const sideEn = isPat ? "Paternal" : "Maternal";
    const prefixEn = greats === 0 ? "" : greats === 1 ? "Great-" : `${greats}x Great-`;
    const roleEn = isTargetMale ? "Grand-Uncle" : "Grand-Aunt";
    const shortEn = `${sideEn} ${prefixEn}${roleEn}`;
    const descEn = `${sideEn} ${prefixEn.toLowerCase()}${isTargetMale ? "grand-uncle" : "grand-aunt"}`;
    const sideHi = isPat ? "पैतृक" : "मातृ";
    const prefixHi = greats === 0 ? "" : `${greats}x पर-`;
    const shortHi = `${sideHi} ${prefixHi}${isTargetMale ? "ग्रैंड-अंकल" : "ग्रैंड-आंट"}`;
    const descHi = isPat
      ? (isTargetMale ? "पिता के दादा/परदादा के भाई (पैतृक)" : "पिता के दादा/परदादा की बहन (पैतृक)")
      : (isTargetMale ? "माता के नाना/परनाना के भाई (मातृ)" : "माता के नाना/परनाना की बहन (मातृ)");
    return {
      shortLabel: isHi ? shortHi : shortEn,
      description: isHi ? descHi : descEn,
      lineageSide: side,
      degree: upSteps - 1
    };
  }

  // Grand-nephews / Grand-nieces (up = 1, down >= 3)
  if (upSteps === 1 && downSteps >= 3) {
    const sib = targetPath[1];
    const greats = downSteps - 3;
    const prefixEn = greats === 0 ? "" : greats === 1 ? "Great-" : `${greats}x Great-`;
    const shortEn = `${prefixEn}${isTargetMale ? "Grand-Nephew" : "Grand-Niece"}`;
    const descEn = `${male(sib) ? "Brother's" : "Sister's"} ${"great-".repeat(downSteps - 2)}${isTargetMale ? "grandson" : "granddaughter"}`;
    const shortHi = `${greats > 0 ? `${greats}x पर-` : ""}${isTargetMale ? "ग्रैंड-भतीजा/भांजा" : "ग्रैंड-भतीजी/भांजी"}`;
    const descHi = `${male(sib) ? "भाई" : "बहन"} की ${downSteps - 1}वीं पीढ़ी के ${isTargetMale ? "वंशज (पौत्र)" : "वंशज (पौत्री)"}`;
    return {
      shortLabel: isHi ? shortHi : shortEn,
      description: isHi ? descHi : descEn,
      lineageSide: "direct",
      degree: downSteps - 1
    };
  }

  // General N-th Cousins & Removed Cousins (up >= 2, down >= 2)
  const cousinDeg = Math.min(upSteps, downSteps) - 1;
  const removed = Math.abs(upSteps - downSteps);
  const side = isPat ? "paternal" : "maternal";
  const ord = ordinal(cousinDeg);
  const remEn = removedSuffixEn(removed);
  const shortEn = `${ord} Cousin${remEn}`;
  const descEn = `${isPat ? "Paternal" : "Maternal"} ${ord} cousin${remEn}`;

  const sideHi = isPat ? "पैतृक" : "मातृ";
  const shortHi = removed === 0
    ? `${cousinDeg}वीं पीढ़ी के ${isTargetMale ? "कज़िन भाई" : "कज़िन बहन"}`
    : `${cousinDeg}वीं पीढ़ी के कज़िन (${removed} पीढ़ी ${upSteps > downSteps ? "ऊपर" : "नीचे"})`;
  const descHi = `${sideHi} पक्ष से ${cousinDeg}वीं पीढ़ी के कज़िन${removed > 0 ? ` (${removed} पीढ़ी का अंतर)` : ""}`;

  return {
    shortLabel: isHi ? shortHi : shortEn,
    description: isHi ? descHi : descEn,
    lineageSide: side,
    degree: cousinDeg
  };
}

function formatPair(shortEn, descEn, lang) {
  const [shortLabel, description] = localizePair(shortEn, descEn, lang);
  return { shortLabel, description };
}

function resolveMaritalTerm(familyIndex, originId, targetId, bfsSteps, lang) {
  const { spouse, kidsOf, parOf, sibsOf, male, elder } = familyIndex;
  const isTargetMale = male(targetId);
  const isOriginMale = male(originId);
  const s = spouse[originId];

  // 1-hop Spouse
  if (s === targetId) {
    return formatPair(isOriginMale ? "Patni" : "Pati", isOriginMale ? "Wife" : "Husband", lang);
  }

  // 2-hop: Child's spouse (Damad / Bahu)
  for (const child of kidsOf(originId)) {
    if (spouse[child] === targetId) {
      return formatPair(isTargetMale ? "Damad" : "Bahu", isTargetMale ? "Son-in-law" : "Daughter-in-law", lang);
    }
  }

  // 2-hop: Spouse's parents (Sasurji / Saas)
  if (s && parOf(s).includes(targetId)) {
    return formatPair(isTargetMale ? "Sasurji" : "Saas", isTargetMale ? "Father-in-law" : "Mother-in-law", lang);
  }

  // 3-hop: Sibling's spouse (Bhabhi / Jija)
  for (const sib of sibsOf(originId)) {
    if (spouse[sib] === targetId) {
      if (male(sib)) {
        return formatPair("Bhabhi", elder(sib, originId) ? "Elder brother's wife" : "Younger brother's wife", lang);
      }
      return formatPair("Jija", "Sister's husband", lang);
    }
  }

  // 3-hop: Spouse's siblings & 4-hop: Spouse's sibling's spouse/kids
  if (s) {
    for (const sib of sibsOf(s)) {
      if (isOriginMale) {
        if (sib === targetId) {
          return formatPair(isTargetMale ? "Sala" : "Sali", isTargetMale ? "Wife's brother" : "Wife's sister", lang);
        }
        if (spouse[sib] === targetId && !male(sib)) {
          return formatPair("Sadhu", "Wife's sister's husband", lang);
        }
      } else {
        const isElderBrother = elder(sib, s);
        if (sib === targetId) {
          if (isTargetMale) {
            return formatPair(isElderBrother ? "Jeth" : "Devar", isElderBrother ? "Husband's elder brother" : "Husband's younger brother", lang);
          }
          return formatPair("Nanad", "Husband's sister", lang);
        }
        if (spouse[sib] === targetId) {
          if (male(sib)) {
            return formatPair(isElderBrother ? "Jethani" : "Devrani", isElderBrother ? "Husband's elder brother's wife" : "Husband's younger brother's wife", lang);
          }
          return formatPair("Nandoi", "Husband's sister's husband", lang);
        }
        if (kidsOf(sib).includes(targetId) && male(sib)) {
          return formatPair(isTargetMale ? "Bhatija" : "Bhatiji", isTargetMale ? "Husband's brother's son" : "Husband's brother's daughter", lang);
        }
      }
    }

    // Spouse's grandparents
    for (const sp of parOf(s)) {
      if (parOf(sp).includes(targetId)) {
        const isPat = male(sp);
        if (isPat) {
          return formatPair(isTargetMale ? "Dada-Sasur" : "Dadi-Saas", isTargetMale ? "Spouse's paternal grandfather" : "Spouse's paternal grandmother", lang);
        }
        return formatPair(isTargetMale ? "Nana-Sasur" : "Nani-Saas", isTargetMale ? "Spouse's maternal grandfather" : "Spouse's maternal grandmother", lang);
      }
    }
  }

  // Uncle / Aunt's spouse (Tai, Chachi, Mami, Phupha, Mausa)
  for (const p of parOf(originId)) {
    const isPat = male(p);
    for (const sib of sibsOf(p)) {
      if (spouse[sib] === targetId) {
        if (male(sib)) {
          const isElderUncle = elder(sib, p);
          if (isPat) {
            return formatPair(isElderUncle ? "Tai" : "Chachi", isElderUncle ? "Tauji's wife" : "Chacha's wife", lang);
          }
          return formatPair("Mami", "Mama's wife", lang);
        }
        return formatPair(isPat ? "Phupha" : "Mausa", isPat ? "Bua's husband" : "Mausi's husband", lang);
      }
    }
  }

  // Child's spouse's parents (Samdhi / Samdhan)
  for (const child of kidsOf(originId)) {
    const childSpouse = spouse[child];
    if (childSpouse && parOf(childSpouse).includes(targetId)) {
      return formatPair(isTargetMale ? "Samdhi" : "Samdhan", isTargetMale ? "Child's spouse's father" : "Child's spouse's mother", lang);
    }
  }

  // Generic N-hop marital bridge fallback
  const hops = bfsSteps.length;
  if (lang === "hi") {
    return {
      shortLabel: hops <= 2 ? "ससुराल पक्ष" : `विवाह संबंध (${hops} चरण)`,
      description: `विवाह के माध्यम से ${hops} चरणों में जुड़ाव`
    };
  }
  return {
    shortLabel: hops <= 2 ? "In-Law" : `By Marriage (${hops} steps)`,
    description: `Connected by marriage in ${hops} ${hops === 1 ? "step" : "steps"}`
  };
}

/**
 * Solves any relationship (direct, culturally exact Indian kinship, arbitrary N-hop
 * LCA blood relation, or shortest-path BFS marital bridge) between originId and targetId.
 *
 * @returns {{
 *   shortLabel: string,
 *   description: string,
 *   isBlood: boolean,
 *   lineageSide: "paternal" | "maternal" | "direct" | "marital" | null,
 *   degree: number | null,
 *   upSteps: number,
 *   downSteps: number,
 *   commonAncestorId: string | null,
 *   pathSteps: Array<{ fromId: string, toId: string, edge: "parent" | "child" | "spouse", relation: string }>
 * }}
 */
export function solveComplexRelation(familyIndex, originId, targetId, lang = "en") {
  if (!familyIndex || !familyIndex.byId || !familyIndex.byId[originId] || !familyIndex.byId[targetId]) {
    const [shortLabel, description] = localizePair("Not Related", "No family connection found", lang);
    return {
      shortLabel,
      description,
      isBlood: false,
      lineageSide: null,
      degree: null,
      upSteps: 0,
      downSteps: 0,
      commonAncestorId: null,
      pathSteps: []
    };
  }

  if (originId === targetId) {
    const [shortLabel, description] = localizePair("You", "This is you", lang);
    return {
      shortLabel,
      description,
      isBlood: true,
      lineageSide: "direct",
      degree: 0,
      upSteps: 0,
      downSteps: 0,
      commonAncestorId: null,
      pathSteps: []
    };
  }

  // 1. Direct spouse always takes precedence as marital
  if (familyIndex.spouse[originId] === targetId) {
    const { shortLabel, description } = resolveMaritalTerm(familyIndex, originId, targetId, [], lang);
    return {
      shortLabel,
      description,
      isBlood: false,
      lineageSide: "marital",
      degree: 1,
      upSteps: 0,
      downSteps: 0,
      commonAncestorId: null,
      pathSteps: [
        {
          fromId: originId,
          toId: targetId,
          edge: "spouse",
          relation: edgeLabel(familyIndex, originId, targetId, "spouse", lang)
        }
      ]
    };
  }

  // 2. Check LCA blood relation
  const lca = findBestLCA(familyIndex, originId, targetId);
  if (lca) {
    const term = resolveBloodTerm(familyIndex, originId, targetId, lca, lang);
    const pathSteps = buildBloodPathSteps(familyIndex, lca.originPath, lca.targetPath, lang);
    const commonAncestorId =
      lca.lcaId !== originId && lca.lcaId !== targetId ? lca.lcaId : null;

    return {
      shortLabel: term.shortLabel,
      description: term.description,
      isBlood: true,
      lineageSide: term.lineageSide,
      degree: term.degree,
      upSteps: lca.upSteps,
      downSteps: lca.downSteps,
      commonAncestorId,
      pathSteps
    };
  }

  // 3. Shortest-path BFS across parent/child/spouse edges for extended marital/affinity relations
  const bfsSteps = findShortestBFSPath(familyIndex, originId, targetId, lang);
  if (bfsSteps && bfsSteps.length > 0) {
    const { shortLabel, description } = resolveMaritalTerm(familyIndex, originId, targetId, bfsSteps, lang);
    return {
      shortLabel,
      description,
      isBlood: false,
      lineageSide: "marital",
      degree: bfsSteps.length,
      upSteps: 0,
      downSteps: 0,
      commonAncestorId: null,
      pathSteps: bfsSteps
    };
  }

  // 4. Disconnected components
  const [shortLabel, description] = localizePair("Not Related", "No family connection found", lang);
  return {
    shortLabel,
    description,
    isBlood: false,
    lineageSide: null,
    degree: null,
    upSteps: 0,
    downSteps: 0,
    commonAncestorId: null,
    pathSteps: []
  };
}

/**
 * Calculates relation of target person relative to origin person.
 * Backward-compatible wrapper returning [shortLabel, description].
 */
export function calculateKinship(familyIndex, originId, targetId, lang = "en") {
  const res = solveComplexRelation(familyIndex, originId, targetId, lang);
  if (res.lineageSide === null && originId !== targetId) {
    return localizePair("Relative", "Family member", lang);
  }
  return [res.shortLabel, res.description];
}
