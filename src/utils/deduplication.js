/**
 * Deduplication and Merging Engine.
 * Cleans up duplicate family records and remaps couple/kid/photo references.
 */

export const STORAGE_KEY = "demo-family-tree-v1";

export function dedup(treeState) {
  if (!treeState?.data?.people) return treeState;

  const people = treeState.data.people.map(p => ({ ...p }));
  const seenById = new Map();
  const uniquePeople = [];

  for (const p of people) {
    if (!p || !p.id) continue;
    const id = String(p.id).trim();
    if (!id) continue;

    if (!seenById.has(id)) {
      seenById.set(id, p);
      uniquePeople.push(p);
    } else {
      // Merge properties if exact same ID exists twice
      const existing = seenById.get(id);
      if (!existing.hi && p.hi) existing.hi = p.hi;
      if (!existing.dob && p.dob) existing.dob = p.dob;
      if (!existing.note && p.note) existing.note = p.note;
      if (p.late) existing.late = true;
    }
  }

  const validIds = new Set(uniquePeople.map(p => p.id));

  const uniqueCouples = [];
  const seenCouples = new Set();
  for (const c of treeState.data.couples || []) {
    if (!c) continue;
    const h = c.h || "";
    const w = c.w || "";
    const kids = (c.kids || [])
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

  const photos = { ...treeState.photos };
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
 * Preserves all manually added people, couples, children, and photos.
 */
export function deepMergeTree(baseState, overlayState) {
  if (!overlayState || typeof overlayState !== "object") return baseState;
  const basePeople = baseState?.data?.people || [];
  const overlayPeople = overlayState?.data?.people || [];

  const mergedPeopleMap = new Map();
  for (const p of basePeople) {
    if (p && p.id) mergedPeopleMap.set(p.id, { ...p });
  }
  for (const p of overlayPeople) {
    if (!p || !p.id) continue;
    if (mergedPeopleMap.has(p.id)) {
      const existing = mergedPeopleMap.get(p.id);
      mergedPeopleMap.set(p.id, {
        ...existing,
        ...p,
        hi: p.hi || existing.hi || "",
        dob: p.dob || existing.dob || "",
        note: p.note || existing.note || "",
        late: Boolean(p.late ?? existing.late)
      });
    } else {
      mergedPeopleMap.set(p.id, { ...p });
    }
  }

  const baseCouples = baseState?.data?.couples || [];
  const overlayCouples = overlayState?.data?.couples || [];
  const mergedCouples = baseCouples.map(c => ({
    ...c,
    kids: Array.isArray(c.kids) ? [...c.kids] : []
  }));

  for (const oc of overlayCouples) {
    if (!oc) continue;
    const h = oc.h || "";
    const w = oc.w || "";
    const match = mergedCouples.find(
      bc => (bc.h === h && bc.w === w) || (h && w && bc.h === w && bc.w === h)
    );
    if (match) {
      match.kids = [...new Set([...(match.kids || []), ...(oc.kids || [])])];
    } else if (
      h &&
      !w &&
      mergedCouples.some(bc => bc.h === h && bc.w)
    ) {
      // Single-parent entry in overlay that now has a spouse in base: merge kids into the full couple
      const fullCouple = mergedCouples.find(bc => bc.h === h && bc.w);
      fullCouple.kids = [...new Set([...(fullCouple.kids || []), ...(oc.kids || [])])];
    } else if (
      w &&
      !h &&
      mergedCouples.some(bc => bc.w === w && bc.h)
    ) {
      const fullCouple = mergedCouples.find(bc => bc.w === w && bc.h);
      fullCouple.kids = [...new Set([...(fullCouple.kids || []), ...(oc.kids || [])])];
    } else {
      mergedCouples.push({
        h,
        w,
        kids: Array.isArray(oc.kids) ? [...oc.kids] : []
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
