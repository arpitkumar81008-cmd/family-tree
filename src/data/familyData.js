/**
 * Gupta Family Tree - Canonical Initial Dataset
 * Contains the core 40 family members and verified couple/parent-child linkages.
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
    createPerson("badri", "Badri Prasad", "बद्री प्रसाद", "M", true),
    createPerson("haudi", "Haudi Devi", "हौदी देवी", "F", true),
    createPerson("sukdev", "Sukdev Prasad", "सुखदेव प्रसाद", "M", true),
    createPerson("surati", "Surati Devi", "सुरती देवी", "F", true),
    createPerson("ram", "Ram Dayal Gupta", "राम दयाल गुप्ता", "M"),
    createPerson("mani", "Shrimani Devi", "श्रीमणि देवी", "F", true),
    createPerson("prabudyal", "Prabud Dayal Gupta", "प्रभुदयाल गुप्ता", "M"),
    createPerson("kamla", "Kamla Devi", "कमला देवी", "F"),
    createPerson("savitri", "Savitri Devi", "सावित्री देवी", "F"),
    createPerson("ramanand", "Ramanand Prasad", "रामानंद प्रसाद", "M"),
    createPerson("pushpa", "Pushpa Devi", "पुष्पा देवी", "F"),
    createPerson("ramayan", "Ramayan Prasad", "रामायण प्रसाद", "M"),
    createPerson("gayatri", "Gayatri Devi", "गायत्री देवी", "F", true),
    createPerson("manju", "Manju Devi", "मंजू देवी", "F"),
    createPerson("lalaji", "Lalaji Prasad", "लालाजी प्रसाद", "M"),
    createPerson("hariom", "Hari Om Gupta", "हरि ओम गुप्ता", "M"),
    createPerson("minal", "Minal Gupta", "मिनल गुप्ता", "F"),
    createPerson("harinarayan", "Hari Narayan Gupta", "हरि नारायण गुप्ता", "M"),
    createPerson("parul", "Parul Gupta", "पारुल गुप्ता", "F"),
    createPerson("ashutosh", "Ashutosh Gupta", "आशुतोष गुप्ता", "M"),
    createPerson("sneha", "Sneha Gupta", "स्नेहा गुप्ता", "F"),
    createPerson("akhilesh", "Akhilesh Gupta", "अखिलेश गुप्ता", "M"),
    createPerson("priya", "Priya Gupta", "प्रिया गुप्ता", "F"),
    createPerson("navin", "Navin Kumar Gupta", "नवीन कुमार गुप्ता", "M"),
    createPerson("munni", "Munni Devi", "मुन्नी देवी", "F"),
    createPerson("harikrishna", "Hari Krishna Gupta", "हरि कृष्ण गुप्ता", "M"),
    createPerson("sitaram", "Sitaram Gupta", "सीताराम गुप्ता", "M", true),
    createPerson("arpit", "Arpit Kumar Gupta", "अर्पित कुमार गुप्ता", "M"),
    createPerson("abhinav", "Abhinav Kumar Gupta", "अभिनव कुमार गुप्ता", "M"),
    createPerson("anurag", "Anurag Kumar Gupta", "अनुराग कुमार गुप्ता", "M"),
    createPerson("akshay", "Akshay Gupta", "अक्षय गुप्ता", "M"),
    createPerson("akshara", "Akshara Gupta", "अक्षरा गुप्ता", "F"),
    createPerson("rishabh", "Rishabh Gupta", "ऋषभ गुप्ता", "M"),
    createPerson("anika", "Anika Gupta", "अनिका गुप्ता", "F"),
    createPerson("nayra", "Nayra Gupta", "नायरा गुप्ता", "F"),
    createPerson("anant", "Anant Kumar Gupta", "अनंत कुमार गुप्ता", "M"),
    createPerson("radha", "Radha Gupta", "राधा गुप्ता", "F"),
    createPerson("sonal", "Sonal Gupta", "सोनल गुप्ता", "F"),
    createPerson("amit", "Amit Gupta", "अमित गुप्ता", "M"),
    createPerson("neha", "Neha Gupta", "नेहा गुप्ता", "F")
  ],
  couples: [
    { h: "badri", w: "haudi", kids: ["sukdev"] },
    { h: "sukdev", w: "surati", kids: ["ram", "prabudyal", "savitri", "pushpa", "gayatri", "manju"] },
    { h: "ram", w: "mani", kids: ["hariom", "harinarayan", "ashutosh", "akhilesh"] },
    { h: "prabudyal", w: "kamla", kids: ["navin", "munni", "harikrishna", "sitaram"] },
    { h: "ramanand", w: "savitri", kids: [] },
    { h: "ramayan", w: "pushpa", kids: [] },
    { h: "lalaji", w: "manju", kids: [] },
    { h: "hariom", w: "minal", kids: ["arpit", "abhinav", "anurag"] },
    { h: "harinarayan", w: "parul", kids: ["akshay", "akshara"] },
    { h: "ashutosh", w: "sneha", kids: ["rishabh", "anika"] },
    { h: "akhilesh", w: "priya", kids: ["nayra"] },
    { h: "anant", w: "radha", kids: ["minal", "sonal", "amit", "neha"] }
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
    if (c.h) children[c.h] = c.kids || [];
    if (c.w) children[c.w] = c.kids || [];
    (c.kids || []).forEach(k => {
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
    .filter(w => w && !["Gupta", "Shri", "गुप्ता", "श्री"].includes(w))
    .slice(0, 2)
    .map(w => Array.from(w)[0])
    .join("");
}
