/**
 * Deduplication & Canonical Deep Merge Engine.
 * Normalizes entity IDs, merges duplicate cards across localStorage versions,
 * and maintains canonical relationship mappings.
 */

export const STORAGE_KEY = "gupta-family-tree-v3";

export const ID_MAP = {
  pmw35a8hzz9vb: "anant",
  pmw365apm43rp: "radha",
  pmw367snwzgc0: "sonal",
  pmw368fiwhg7t: "amit",
  pmw369susss6n: "neha",
  pmw36ewobm5ii: "sukdev",
  pmw36fp2e6yvz: "surati",
  pmw36gixkfjgi: "prabudyal",
  pmw36gv4fsgza: "kamla"
};

export const NAME_MAP = {
  "anant kumar gupta": "anant",
  "shrimani devi": "mani",
  "श्रीमणि देवी": "mani",
  "shrimani gupta": "mani",
  "shri mani gupta": "mani",
  "श्री मणि गुप्ता": "mani",
  "अनंत कुमार गुप्ता": "anant",
  "radha gupta": "radha",
  "राधा गुप्ता": "radha",
  "sonal gupta": "sonal",
  "सोनल गुप्ता": "sonal",
  "amit gupta": "amit",
  "अमित गुप्ता": "amit",
  "neha gupta": "neha",
  "नेहा गुप्ता": "neha",
  "sukhdeo prasad": "sukdev",
  "sukdev prasad": "sukdev",
  "surati devi": "surati",
  "prabhu dayal gupta": "prabudyal",
  "prabud dayal gupta": "prabudyal",
  "kamala devi": "kamla",
  "kamla devi": "kamla"
};

export function dedup(treeState) {
  if (!treeState || !treeState.data || !Array.isArray(treeState.data.people)) {
    return treeState;
  }

  const people = treeState.data.people;
  const seen = new Map();
  const remap = new Map();
  const uniquePeople = [];

  for (const person of people) {
    const key = (person.name || "").trim().toLowerCase();
    if (!key) {
      uniquePeople.push(person);
      continue;
    }
    if (seen.has(key)) {
      const canonical = seen.get(key);
      remap.set(person.id, canonical.id);
      if (!canonical.hi && person.hi) canonical.hi = person.hi;
      if (!canonical.dob && person.dob) canonical.dob = person.dob;
      if (!canonical.note && person.note) canonical.note = person.note;
    } else {
      seen.set(key, person);
      uniquePeople.push(person);
    }
  }

  if (remap.size === 0) return treeState;

  const couples = (treeState.data.couples || []).map(c => {
    const h = remap.get(c.h) || c.h;
    const w = remap.get(c.w) || c.w;
    const kids = (c.kids || [])
      .map(k => remap.get(k) || k)
      .filter((id, idx, arr) => arr.indexOf(id) === idx);
    return { ...c, h, w, kids };
  });

  const uniqueCouples = [];
  const seenCouples = new Set();
  for (const c of couples) {
    const k = `${c.h}_${c.w}`;
    if (!seenCouples.has(k)) {
      seenCouples.add(k);
      uniqueCouples.push(c);
    } else {
      const existing = uniqueCouples.find(x => x.h === c.h && x.w === c.w);
      if (existing) {
        existing.kids = [...new Set([...existing.kids, ...c.kids])];
      }
    }
  }

  const photos = { ...treeState.photos };
  for (const [dupId, canId] of remap.entries()) {
    if (photos[dupId] && !photos[canId]) photos[canId] = photos[dupId];
    delete photos[dupId];
  }

  return {
    ...treeState,
    data: { people: uniquePeople, couples: uniqueCouples },
    photos,
    viewer: remap.get(treeState.viewer) || treeState.viewer
  };
}

export function deepMergeTree(base, storedList) {
  const mapId = id => (id ? ID_MAP[id] || id : "");
  const peopleMap = new Map();
  const nameToId = new Map();

  base.people.forEach(p => {
    peopleMap.set(p.id, { ...p });
    nameToId.set((p.name || "").trim().toLowerCase(), p.id);
    if (p.hi) nameToId.set(p.hi.trim(), p.id);
  });

  const photos = {};
  let lang = "en";
  let viewer = "";

  storedList.forEach(stored => {
    if (!stored) return;
    if (stored.lang) lang = stored.lang;
    if (stored.viewer) viewer = stored.viewer;
    for (const [oldId, url] of Object.entries(stored.photos || {})) {
      photos[mapId(oldId)] = url;
    }
    (stored.data?.people || []).forEach(sp => {
      const normName = (sp.name || "").trim().toLowerCase();
      const hiName = (sp.hi || "").trim();
      let resolvedId = mapId(sp.id);
      if (NAME_MAP[normName]) resolvedId = NAME_MAP[normName];
      else if (hiName && NAME_MAP[hiName]) resolvedId = NAME_MAP[hiName];
      else if (nameToId.has(normName)) resolvedId = nameToId.get(normName);
      else if (hiName && nameToId.has(hiName)) resolvedId = nameToId.get(hiName);

      if (peopleMap.has(resolvedId)) {
        const cur = peopleMap.get(resolvedId);
        peopleMap.set(resolvedId, {
          ...cur,
          ...sp,
          id: resolvedId,
          name: cur.name || sp.name,
          hi: cur.hi || sp.hi,
          g: cur.g || sp.g,
          note: sp.note || cur.note,
          dob: sp.dob || cur.dob,
          late: cur.late || sp.late
        });
      } else {
        peopleMap.set(resolvedId, { ...sp, id: resolvedId });
        if (normName) nameToId.set(normName, resolvedId);
        if (hiName) nameToId.set(hiName, resolvedId);
      }
    });
  });

  const couples = base.couples.map(c => ({
    h: mapId(c.h),
    w: mapId(c.w),
    kids: (c.kids || []).map(mapId).filter(Boolean)
  }));

  storedList.forEach(stored => {
    (stored?.data?.couples || []).forEach(sc => {
      const h = mapId(sc.h);
      const w = mapId(sc.w);
      const kids = (sc.kids || []).map(mapId).filter(Boolean);
      if (!h && !w) return;
      const exact = couples.find(c => (c.h === h && c.w === w) || (c.h === w && c.w === h));
      if (exact) {
        exact.kids = Array.from(new Set([...exact.kids, ...kids]));
        return;
      }
      if (h && !w) {
        const full = couples.find(c => c.h === h || c.w === h);
        if (full) {
          full.kids = Array.from(new Set([...full.kids, ...kids]));
          return;
        }
      }
      if (w && !h) {
        const full = couples.find(c => c.h === w || c.w === w);
        if (full) {
          full.kids = Array.from(new Set([...full.kids, ...kids]));
          return;
        }
      }
      couples.push({ h, w, kids: Array.from(new Set(kids)) });
    });
  });

  const cleanedCouples = [];
  for (const c of couples) {
    if ((!c.h || !c.w) && (c.h || c.w)) {
      const partner = c.h || c.w;
      const full = couples.find(
        other => (other.h === partner && other.w) || (other.w === partner && other.h)
      );
      if (full) {
        full.kids = Array.from(new Set([...full.kids, ...c.kids]));
        continue;
      }
    }
    cleanedCouples.push(c);
  }

  return {
    data: {
      people: Array.from(peopleMap.values()),
      couples: cleanedCouples
    },
    photos,
    lang,
    viewer
  };
}
