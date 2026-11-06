/**
 * Public Demo Family Tree - Fictional "Sharma Family Lineage" (22 members across 4 generations)
 * Used as the default public demonstration dataset so no personal/private family data is shipped in the public bundle.
 */

const createPerson = (id, name, hi, g, late = false) => ({
  id,
  name,
  hi,
  g,
  ...(late ? { late: true } : {})
});

export const INITIAL_DATA = {
  people: [
    // Generation 0 — Founding Ancestors
    createPerson("raghunath", "Raghunath Sharma", "रघुनाथ शर्मा", "M", true),
    createPerson("kalyani", "Kalyani Devi", "कल्याणी देवी", "F", true),

    // Generation 1 — Grandparents
    createPerson("mahendra", "Mahendra Sharma", "महेंद्र शर्मा", "M", true),
    createPerson("saraswati", "Saraswati Devi", "सरस्वती देवी", "F", true),
    createPerson("surendra", "Surendra Sharma", "सुरेंद्र शर्मा", "M"),
    createPerson("vimla", "Vimla Devi", "विमला देवी", "F"),

    // Generation 2 — Parents + Aunts/Uncles + In-Law Root
    createPerson("rajesh", "Rajesh Sharma", "राजेश शर्मा", "M"),
    createPerson("sunita", "Sunita Sharma", "सुनीता शर्मा", "F"),
    createPerson("dinesh", "Dinesh Sharma", "दिनेश शर्मा", "M"),
    createPerson("meena", "Meena Sharma", "मीना शर्मा", "F"),
    createPerson("kavita", "Kavita Verma", "कविता वर्मा", "F"),
    createPerson("sanjay", "Sanjay Verma", "संजय वर्मा", "M"),
    createPerson("vikram", "Vikram Mishra", "विक्रम मिश्रा", "M"),
    createPerson("asha", "Asha Mishra", "आशा मिश्रा", "F"),

    // Generation 3 — Focal Generation & Cousins & In-Law Siblings
    createPerson("rohan", "Rohan Sharma", "रोहन शर्मा", "M"),
    createPerson("ananya", "Ananya Sharma", "अनन्या शर्मा", "F"),
    createPerson("sidharth", "Sidharth Sharma", "सिद्धार्थ शर्मा", "M"),
    createPerson("pooja", "Pooja Sharma", "पूजा शर्मा", "F"),
    createPerson("nikhil", "Nikhil Sharma", "निखिल शर्मा", "M"),
    createPerson("kriti", "Kriti Mishra", "कृति मिश्रा", "F"),
    createPerson("dev", "Dev Mishra", "देव मिश्रा", "M"),

    // Generation 4 — Grandchildren
    createPerson("aarav", "Aarav Sharma", "आरव शर्मा", "M"),
    createPerson("diya", "Diya Sharma", "दिया शर्मा", "F"),
    createPerson("vihaan", "Vihaan Sharma", "विहान शर्मा", "M")
  ],
  couples: [
    { h: "raghunath", w: "kalyani", kids: ["mahendra", "surendra"] },
    { h: "mahendra", w: "saraswati", kids: ["rajesh", "dinesh", "kavita"] },
    { h: "surendra", w: "vimla", kids: ["nikhil"] },
    { h: "rajesh", w: "sunita", kids: ["rohan", "sidharth"] },
    { h: "dinesh", w: "meena", kids: [] },
    { h: "sanjay", w: "kavita", kids: [] },
    { h: "rohan", w: "ananya", kids: ["aarav", "diya"] },
    { h: "sidharth", w: "pooja", kids: ["vihaan"] },
    { h: "vikram", w: "asha", kids: ["ananya", "kriti", "dev"] }
  ]
};

/**
 * Builds fast index lookup maps for family tree queries.
 */
export function buildFamilyIndex(data) {
  const byId = {};
  data.people.forEach(p => { byId[p.id] = p; });

  const spouse = {};
  const parents = {};
  const children = {};
  const cok = {};

  data.couples.forEach(c => {
    if (c.h && c.w) {
      spouse[c.h] = c.w;
      spouse[c.w] = c.h;
    }
    const kids = c.kids || [];
    if (c.h) {
      children[c.h] = Array.from(new Set([...(children[c.h] || []), ...kids]));
    }
    if (c.w) {
      children[c.w] = Array.from(new Set([...(children[c.w] || []), ...kids]));
    }
    kids.forEach(k => {
      parents[k] = [c.h, c.w].filter(Boolean);
      cok[k] = c;
    });
  });

  return {
    byId,
    spouse,
    parents,
    children,
    cok,
    kidsOf: id => children[id] || [],
    parOf: id => parents[id] || [],
    sibsOf: id => (cok[id] ? cok[id].kids.filter(k => k !== id) : []),
    male: id => byId[id]?.g === "M",
    elder: (a, b) => {
      const kids = cok[a]?.kids;
      return kids ? kids.indexOf(a) < kids.indexOf(b) : false;
    }
  };
}

/**
 * Extracts 1-2 letter initials from a person's display name.
 */
export function getInitials(name = "") {
  return name
    .split(" ")
    .filter(w => w && !["Gupta", "Sharma", "Shri", "गुप्ता", "शर्मा", "श्री"].includes(w))
    .slice(0, 2)
    .map(w => Array.from(w)[0])
    .join("");
}
