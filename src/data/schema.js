/**
 * Data model schemas and validators for the generic family tree engine.
 */

export const GENDER = {
  MALE: "M",
  FEMALE: "F"
};

export const RELATION_TYPES = {
  CHILD: "child",
  SPOUSE: "spouse",
  SIBLING: "sibling",
  PARENT: "parent",
  ROOT: "root"
};

const MAX_ENTRIES = 5000;
const MAX_PAYLOAD_BYTES = 900 * 1024;
const MAX_ID_LEN = 100;
const MAX_NAME_LEN = 120;
const MAX_DOB_LEN = 30;
const MAX_NOTE_LEN = 2000;
const MAX_PHOTO_URL_LEN = 250000;
const MAX_PHOTOS_COUNT = 500;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const SAFE_DATA_IMAGE_RE = /^data:image\/(?:jpeg|jpg|png|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/i;
const SAFE_LOCAL_IMAGE_RE = /^\/images\/[A-Za-z0-9._/-]+$/;
const SAFE_REMOTE_IMAGE_RE =
  /^https:\/\/(?:[a-z0-9-]+\.)*(?:googleusercontent\.com|firebasestorage\.googleapis\.com)\/[^\s"'<>]+$/i;

export function isSafePhotoUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > MAX_PHOTO_URL_LEN) return false;
  return (
    SAFE_DATA_IMAGE_RE.test(trimmed) ||
    SAFE_LOCAL_IMAGE_RE.test(trimmed) ||
    SAFE_REMOTE_IMAGE_RE.test(trimmed)
  );
}

export function sanitizePhotosMap(photos) {
  if (!photos || typeof photos !== "object" || Array.isArray(photos)) {
    return {};
  }
  const clean = {};
  let count = 0;
  for (const [key, val] of Object.entries(photos)) {
    if (count >= MAX_PHOTOS_COUNT) break;
    if (!key || FORBIDDEN_KEYS.has(key) || key.length > MAX_ID_LEN) continue;
    if (isSafePhotoUrl(val)) {
      clean[key] = val.trim();
      count += 1;
    }
  }
  return clean;
}

export function validateTreeData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Data is not an object" };
  }
  if (!Array.isArray(data.people)) {
    return { valid: false, error: "people must be an array" };
  }
  if (!Array.isArray(data.couples)) {
    return { valid: false, error: "couples must be an array" };
  }
  if (data.people.length + data.couples.length > MAX_ENTRIES) {
    return {
      valid: false,
      error: `Tree exceeds maximum limit of ${MAX_ENTRIES.toLocaleString()} entries`
    };
  }

  let jsonStr;
  try {
    jsonStr = JSON.stringify(data);
  } catch {
    return { valid: false, error: "Tree data cannot be serialized to JSON" };
  }
  const byteLength =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(jsonStr).length
      : jsonStr.length;
  if (byteLength > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: "Tree data exceeds maximum JSON payload size of 900 KB"
    };
  }

  const idSet = new Set();
  for (const person of data.people) {
    if (!person || typeof person !== "object" || Array.isArray(person)) {
      return { valid: false, error: "Each person entry must be an object" };
    }
    if (!person.id || typeof person.id !== "string" || !person.id.trim()) {
      return { valid: false, error: "Invalid person ID" };
    }
    if (FORBIDDEN_KEYS.has(person.id)) {
      return { valid: false, error: `Forbidden person ID: ${person.id}` };
    }
    if (person.id.length > MAX_ID_LEN) {
      return { valid: false, error: `Person ID exceeds ${MAX_ID_LEN} characters: ${person.id.slice(0, 30)}...` };
    }
    if (idSet.has(person.id)) {
      return { valid: false, error: `Duplicate person ID: ${person.id}` };
    }
    if (!person.name || typeof person.name !== "string" || !person.name.trim()) {
      return { valid: false, error: `Invalid person name for ID: ${person.id}` };
    }
    if (person.name.length > MAX_NAME_LEN) {
      return { valid: false, error: `Person name exceeds ${MAX_NAME_LEN} characters for ID: ${person.id}` };
    }
    if (person.hi !== undefined && person.hi !== null) {
      if (typeof person.hi !== "string") {
        return { valid: false, error: `Hindi name must be a string for ID: ${person.id}` };
      }
      if (person.hi.length > MAX_NAME_LEN) {
        return { valid: false, error: `Hindi name exceeds ${MAX_NAME_LEN} characters for ID: ${person.id}` };
      }
    }
    if (person.dob !== undefined && person.dob !== null) {
      if (typeof person.dob !== "string") {
        return { valid: false, error: `Date of birth must be a string for ID: ${person.id}` };
      }
      if (person.dob.length > MAX_DOB_LEN) {
        return { valid: false, error: `Date of birth exceeds ${MAX_DOB_LEN} characters for ID: ${person.id}` };
      }
    }
    if (person.city !== undefined && person.city !== null) {
      if (typeof person.city !== "string") {
        return { valid: false, error: `City must be a string for ID: ${person.id}` };
      }
      if (person.city.length > MAX_NAME_LEN) {
        return { valid: false, error: `City exceeds ${MAX_NAME_LEN} characters for ID: ${person.id}` };
      }
    }
    if (person.anniversary !== undefined && person.anniversary !== null) {
      if (typeof person.anniversary !== "string") {
        return { valid: false, error: `Anniversary must be a string for ID: ${person.id}` };
      }
      if (person.anniversary.length > MAX_DOB_LEN) {
        return { valid: false, error: `Anniversary exceeds ${MAX_DOB_LEN} characters for ID: ${person.id}` };
      }
    }
    if (person.note !== undefined && person.note !== null) {
      if (typeof person.note !== "string") {
        return { valid: false, error: `Note must be a string for ID: ${person.id}` };
      }
      if (person.note.length > MAX_NOTE_LEN) {
        return { valid: false, error: `Note exceeds ${MAX_NOTE_LEN} characters for ID: ${person.id}` };
      }
    }
    if (person.g !== "M" && person.g !== "F") {
      return { valid: false, error: `Person gender must be 'M' or 'F' for ID: ${person.id}` };
    }
    idSet.add(person.id);
  }

  const coupleIdSet = new Set();
  const couplePairSet = new Set();
  const childParentSet = new Set();
  const parentsOf = new Map();

  for (const couple of data.couples) {
    if (!couple || typeof couple !== "object" || Array.isArray(couple)) {
      return { valid: false, error: "Each couple entry must be an object" };
    }
    if (couple.id !== undefined && couple.id !== null) {
      if (typeof couple.id !== "string" || !couple.id.trim()) {
        return { valid: false, error: "Invalid couple ID" };
      }
      if (FORBIDDEN_KEYS.has(couple.id)) {
        return { valid: false, error: `Forbidden couple ID: ${couple.id}` };
      }
      if (couple.id.length > MAX_ID_LEN) {
        return { valid: false, error: `Couple ID exceeds ${MAX_ID_LEN} characters` };
      }
      if (coupleIdSet.has(couple.id)) {
        return { valid: false, error: `Duplicate couple ID: ${couple.id}` };
      }
      coupleIdSet.add(couple.id);
    }

    const h = couple.h || "";
    const w = couple.w || "";
    if (h) {
      if (typeof h !== "string" || h.length > MAX_ID_LEN) {
        return { valid: false, error: "Invalid husband ID in couple" };
      }
      if (!idSet.has(h)) {
        return { valid: false, error: `Husband ID not found: ${h}` };
      }
    }
    if (w) {
      if (typeof w !== "string" || w.length > MAX_ID_LEN) {
        return { valid: false, error: "Invalid wife ID in couple" };
      }
      if (!idSet.has(w)) {
        return { valid: false, error: `Wife ID not found: ${w}` };
      }
    }
    if (h && w && h === w) {
      return { valid: false, error: `A person cannot be coupled with themselves: ${h}` };
    }

    const pairKey = `${h}|${w}`;
    if (couplePairSet.has(pairKey)) {
      return { valid: false, error: `Duplicate couple entry for (${h || "none"}, ${w || "none"})` };
    }
    couplePairSet.add(pairKey);

    if (couple.kids !== undefined && couple.kids !== null) {
      if (!Array.isArray(couple.kids)) {
        return { valid: false, error: "Couple kids must be an array" };
      }
      for (const kid of couple.kids) {
        if (typeof kid !== "string" || !idSet.has(kid)) {
          return { valid: false, error: `Child ID not found: ${kid}` };
        }
        if (kid === h || kid === w) {
          return { valid: false, error: `A person cannot be their own child: ${kid}` };
        }
        if (childParentSet.has(kid)) {
          return { valid: false, error: `Child belongs to more than one couple: ${kid}` };
        }
        childParentSet.add(kid);
        parentsOf.set(kid, [h, w].filter(Boolean));
      }
    }
  }

  // Detect ancestor cycles using 3-color DFS (0 = unvisited, 1 = visiting, 2 = visited)
  const visitState = new Map();
  const hasCycle = personId => {
    const state = visitState.get(personId) || 0;
    if (state === 1) return personId;
    if (state === 2) return null;

    visitState.set(personId, 1);
    const parents = parentsOf.get(personId) || [];
    for (const parentId of parents) {
      const cycleNode = hasCycle(parentId);
      if (cycleNode) return cycleNode;
    }
    visitState.set(personId, 2);
    return null;
  };

  for (const personId of idSet) {
    const cycleNode = hasCycle(personId);
    if (cycleNode) {
      return { valid: false, error: `Ancestor cycle detected involving person: ${cycleNode}` };
    }
  }

  return { valid: true };
}
