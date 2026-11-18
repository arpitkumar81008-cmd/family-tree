/**
 * Deduplication and Merging Engine.
 * Cleans up duplicate family records, preserves all profile metadata (including
 * Hindi names, DOB, city, anniversary, notes, and memorial flags), and remaps
 * couple, child, and photo references without data loss.
 */

export const STORAGE_KEY = "demo-family-tree-v1";

/**
 * Deduplicates people and couples in a tree state object while preserving all
 * non-empty fields across duplicate person entries and pruning orphaned photos.
 *
 * @param {object} treeState
 * @returns {object}
 */
export function dedup(treeState) {
  if (!treeState?.data || !Array.isArray(treeState.data.people)) return treeState;

  const people = treeState.data.people.map(p => (p && typeof p === "object" ? { ...p } : null));
  const seenById = new Map();
  const uniquePeople = [];

  for (const p of people) {
    if (!p || !p.id) continue;
    const id = String(p.id).trim();
    if (!id) continue;
    p.id = id;

    if (!seenById.has(id)) {
      seenById.set(id, p);
      uniquePeople.push(p);
    } else {
      // Merge properties if exact same ID exists twice
      const existing = seenById.get(id);
      if (!existing.name && p.name) existing.name = p.name;
      if (!existing.g && p.g) existing.g = p.g;
      if (!existing.hi && p.hi) existing.hi = p.hi;
      if (!existing.dob && p.dob) existing.dob = p.dob;
      if (!existing.city && p.city) existing.city = p.city;
      if (!existing.anniversary && p.anniversary) existing.anniversary = p.anniversary;
      if (!existing.note && p.note) existing.note = p.note;
      if (p.late) existing.late = true;

      for (const [key, val] of Object.entries(p)) {
        if (key === "id" || key === "late") continue;
        if (
          (existing[key] === undefined || existing[key] === null || existing[key] === "") &&
          val !== undefined &&
          val !== null &&
          val !== ""
        ) {
          existing[key] = val;
        }
      }
    }
  }

  const validIds = new Set(uniquePeople.map(p => p.id));

  const uniqueCouples = [];
  const seenCouples = new Set();
  for (const c of treeState.data.couples || []) {
    if (!c || typeof c !== "object") continue;
    const h = c.h || "";
    const w = c.w || "";
    const rawKids = Array.isArray(c.kids) ? c.kids : [];
    const kids = rawKids
      .filter(id => validIds.has(id))
      .filter((id, idx, arr) => arr.indexOf(id) === idx);

    const k = `${h}_${w}`;
    if (!seenCouples.has(k)) {
      seenCouples.add(k);
      uniqueCouples.push({ ...c, h, w, kids });
    } else {
      const existing = uniqueCouples.find(x => x.h === h && x.w === w);
      if (existing) {
        existing.kids = [...new Set([...existing.kids, ...kids])];
      }
    }
  }

  const photos =
    treeState.photos && typeof treeState.photos === "object" && !Array.isArray(treeState.photos)
      ? { ...treeState.photos }
      : {};
  for (const photoId of Object.keys(photos)) {
    if (!validIds.has(photoId)) {
      delete photos[photoId];
    }
  }

  return {
    ...treeState,
    data: { people: uniquePeople, couples: uniqueCouples },
    photos,
    viewer: treeState.viewer || ""
  };
}

/**
 * Non-destructively merges `overlayState` (such as localStorage additions)
 * into `baseState` (such as a Cloud Firestore snapshot or initial dataset).
 * Preserves all manually added people, couples, children, metadata fields
 * (`hi`, `dob`, `city`, `anniversary`, `note`, `late`), and photos.
 *
 * @param {object} baseState
 * @param {object} overlayState
 * @returns {object}
 */
export function deepMergeTree(baseState, overlayState) {
  if (!overlayState || typeof overlayState !== "object") return baseState;
  const basePeople = Array.isArray(baseState?.data?.people) ? baseState.data.people : [];
  const overlayPeople = Array.isArray(overlayState?.data?.people) ? overlayState.data.people : [];

  const mergedPeopleMap = new Map();
  for (const p of basePeople) {
    if (p && typeof p === "object" && p.id) {
      mergedPeopleMap.set(p.id, { ...p });
    }
  }
  for (const p of overlayPeople) {
    if (!p || typeof p !== "object" || !p.id) continue;
    if (mergedPeopleMap.has(p.id)) {
      const existing = mergedPeopleMap.get(p.id);
      const mergedPerson = { ...existing };
      for (const [key, val] of Object.entries(p)) {
        if (val !== undefined && val !== null && val !== "") {
          mergedPerson[key] = val;
        } else if (!(key in mergedPerson)) {
          mergedPerson[key] = val;
        }
      }
      if (p.hi || existing.hi) mergedPerson.hi = p.hi || existing.hi || "";
      else if ("hi" in p || "hi" in existing) mergedPerson.hi = "";

      if (p.dob || existing.dob) mergedPerson.dob = p.dob || existing.dob || "";
      else if ("dob" in p || "dob" in existing) mergedPerson.dob = "";

      if (p.city || existing.city) mergedPerson.city = p.city || existing.city || "";
      else if ("city" in p || "city" in existing) mergedPerson.city = "";

      if (p.anniversary || existing.anniversary) {
        mergedPerson.anniversary = p.anniversary || existing.anniversary || "";
      } else if ("anniversary" in p || "anniversary" in existing) {
        mergedPerson.anniversary = "";
      }

      if (p.note || existing.note) mergedPerson.note = p.note || existing.note || "";
      else if ("note" in p || "note" in existing) mergedPerson.note = "";

      if (p.late !== undefined || existing.late !== undefined) {
        mergedPerson.late = Boolean(p.late ?? existing.late);
      }
      mergedPeopleMap.set(p.id, mergedPerson);
    } else {
      mergedPeopleMap.set(p.id, { ...p });
    }
  }

  const baseCouples = Array.isArray(baseState?.data?.couples) ? baseState.data.couples : [];
  const overlayCouples = Array.isArray(overlayState?.data?.couples) ? overlayState.data.couples : [];
  const mergedCouples = baseCouples
    .filter(c => c && typeof c === "object")
    .map(c => ({
      ...c,
      kids: Array.isArray(c.kids) ? [...c.kids] : []
    }));

  for (const oc of overlayCouples) {
    if (!oc || typeof oc !== "object") continue;
    const h = oc.h || "";
    const w = oc.w || "";
    const ocKids = Array.isArray(oc.kids) ? oc.kids : [];
    const match = mergedCouples.find(
      bc => (bc.h === h && bc.w === w) || (h && w && bc.h === w && bc.w === h)
    );
    if (match) {
      match.kids = [...new Set([...(match.kids || []), ...ocKids])];
    } else if (
      h &&
      !w &&
      mergedCouples.some(bc => bc.h === h && bc.w)
    ) {
      // Single-parent entry in overlay that now has a spouse in base: merge kids into the full couple
      const fullCouple = mergedCouples.find(bc => bc.h === h && bc.w);
      fullCouple.kids = [...new Set([...(fullCouple.kids || []), ...ocKids])];
    } else if (
      w &&
      !h &&
      mergedCouples.some(bc => bc.w === w && bc.h)
    ) {
      const fullCouple = mergedCouples.find(bc => bc.w === w && bc.h);
      fullCouple.kids = [...new Set([...(fullCouple.kids || []), ...ocKids])];
    } else {
      mergedCouples.push({
        h,
        w,
        kids: [...ocKids]
      });
    }
  }

  // Also collapse any single-parent couple in base if overlay added a spouse for that parent
  const finalCouples = [];
  for (const c of mergedCouples) {
    if (c.h && !c.w) {
      const withWife = mergedCouples.find(x => x !== c && x.h === c.h && x.w);
      if (withWife) {
        withWife.kids = [...new Set([...(withWife.kids || []), ...(c.kids || [])])];
        continue;
      }
    }
    if (c.w && !c.h) {
      const withHusband = mergedCouples.find(x => x !== c && x.w === c.w && x.h);
      if (withHusband) {
        withHusband.kids = [...new Set([...(withHusband.kids || []), ...(c.kids || [])])];
        continue;
      }
    }
    finalCouples.push(c);
  }

  return dedup({
    ...baseState,
    data: {
      people: Array.from(mergedPeopleMap.values()),
      couples: finalCouples
    },
    photos: { ...(baseState?.photos || {}), ...(overlayState?.photos || {}) },
    viewer: overlayState?.viewer || baseState?.viewer || "",
    lang: overlayState?.lang || baseState?.lang || "en"
  });
}
