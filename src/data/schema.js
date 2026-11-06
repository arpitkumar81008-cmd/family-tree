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

export function validateTreeData(data) {
  if (!data || typeof data !== "object") return { valid: false, error: "Data is not an object" };
  if (!Array.isArray(data.people)) return { valid: false, error: "people must be an array" };
  if (!Array.isArray(data.couples)) return { valid: false, error: "couples must be an array" };

  const idSet = new Set();
  for (const person of data.people) {
    if (!person.id || typeof person.id !== "string") return { valid: false, error: "Invalid person ID" };
    if (!person.name || typeof person.name !== "string") return { valid: false, error: "Invalid person name" };
    if (person.g !== "M" && person.g !== "F") return { valid: false, error: "Person gender must be 'M' or 'F'" };
    idSet.add(person.id);
  }

  for (const couple of data.couples) {
    if (couple.h && !idSet.has(couple.h)) return { valid: false, error: `Husband ID not found: ${couple.h}` };
    if (couple.w && !idSet.has(couple.w)) return { valid: false, error: `Wife ID not found: ${couple.w}` };
    if (Array.isArray(couple.kids)) {
      for (const kid of couple.kids) {
        if (!idSet.has(kid)) return { valid: false, error: `Child ID not found: ${kid}` };
      }
    }
  }

  return { valid: true };
}
