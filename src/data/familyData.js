/**
 * Public Demo Family Tree - "The Verma Family Lineage" (26 members across 5 generations)
 * Fictional demonstration dataset so no personal/private family data is shipped in the public bundle.
 */

const createPerson = (id, name, hi, g, { late = false, dob = '' } = {}) => ({
  id,
  name,
  hi,
  g,
  ...(dob ? { dob } : {}),
  ...(late ? { late: true } : {})
});

export const INITIAL_DATA = {
  people: [
    // Generation 0 — Founding Ancestors
    createPerson('harish', 'Harishchandra Verma', 'हरिश्चंद्र वर्मा', 'M', { late: true, dob: '1918-04-12' }),
    createPerson('savitri', 'Savitri Devi Verma', 'सावित्री देवी वर्मा', 'F', { late: true }),

    // Generation 1 — Children & Spouses
    createPerson('mohan', 'Mohanlal Verma', 'मोहनलाल वर्मा', 'M', { late: true, dob: '1942-08-19' }),
    createPerson('kamla', 'Kamla Joshi', 'कमला जोशी', 'F', { late: true, dob: '1946-03-05' }),
    createPerson('sunita', 'Sunita Saxena', 'सुनीता सक्सेना', 'F', { dob: '1945-11-22' }),
    createPerson('vinod', 'Vinod Saxena', 'विनोद सक्सेना', 'M', { late: true, dob: '1941-01-15' }),
    createPerson('rakesh', 'Rakesh Verma', 'राकेश वर्मा', 'M', { dob: '1950-06-30' }),
    createPerson('rekha', 'Rekha Malhotra', 'रेखा मल्होत्रा', 'F', { dob: '1954-09-14' }),

    // Generation 2 — Grandchildren, Spouses & In-Law Branch
    createPerson('vikram', 'Vikram Verma', 'विक्रम वर्मा', 'M', { dob: '1970-02-10' }),
    createPerson('meera', 'Meera Iyer', 'मीरा अय्यर', 'F', { dob: '1973-07-18' }),
    createPerson('anjali', 'Anjali Verma', 'अंजलि वर्मा', 'F', { dob: '1972-12-03' }),
    createPerson('deepak', 'Deepak Verma', 'दीपक वर्मा', 'M', { dob: '1976-05-25' }),
    createPerson('priya', 'Priya Nair', 'प्रिया नायर', 'F', { dob: '1979-10-08' }),
    createPerson('rohit', 'Rohit Saxena', 'रोहित सक्सेना', 'M', { dob: '1974-04-16' }),
    createPerson('kiran', 'Kiran Rao', 'किरण राव', 'F', { dob: '1976-06-14' }),
    createPerson('neha', 'Neha Verma', 'नेहा वर्मा', 'F', { dob: '1978-08-29' }),
    createPerson('sanjay', 'Sanjay Verma', 'संजय वर्मा', 'M', { dob: '1981-01-11' }),

    // In-law Branch: Meera Iyer's Parents
    createPerson('subramanian', 'Subramanian Iyer', 'सुब्रमण्यम अय्यर', 'M', { late: true }),
    createPerson('lakshmi', 'Lakshmi Iyer', 'लक्ष्मी अय्यर', 'F'),

    // Generation 3 — Great-Grandchildren & Spouses
    createPerson('arjun', 'Arjun Verma', 'अर्जुन वर्मा', 'M', { dob: '1996-03-21' }),
    createPerson('tara', 'Tara Kulkarni', 'तारा कुलकर्णी', 'F', { dob: '1997-09-12' }),
    createPerson('kavya', 'Kavya Verma', 'काव्य वर्मा', 'F', { dob: '1999-11-04' }),
    createPerson('aditi', 'Aditi Verma', 'अदिति वर्मा', 'F'),
    createPerson('ishaan', 'Ishaan Saxena', 'ईशान सक्सेना', 'M'),

    // Generation 4 — Great-Great-Grandchildren (no birth dates)
    createPerson('aarav', 'Aarav Verma', 'आरव वर्मा', 'M'),
    createPerson('diya', 'Diya Verma', 'दिया वर्मा', 'F')
  ],
  couples: [
    { h: 'harish', w: 'savitri', kids: ['mohan', 'sunita', 'rakesh'] },
    { h: 'mohan', w: 'kamla', kids: ['vikram', 'anjali', 'deepak'] },
    { h: 'vinod', w: 'sunita', kids: ['rohit'] },
    { h: 'rakesh', w: 'rekha', kids: ['neha', 'sanjay'] },
    { h: 'subramanian', w: 'lakshmi', kids: ['meera'] },
    { h: 'vikram', w: 'meera', kids: ['arjun', 'kavya'] },
    { h: 'deepak', w: 'priya', kids: ['aditi'] },
    { h: 'rohit', w: 'kiran', kids: ['ishaan'] },
    { h: 'arjun', w: 'tara', kids: ['aarav', 'diya'] }
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
    male: id => byId[id]?.g === 'M',
    elder: (a, b) => {
      const kids = cok[a]?.kids;
      return kids ? kids.indexOf(a) < kids.indexOf(b) : false;
    }
  };
}

/**
 * Extracts 1-2 letter initials from a person's display name.
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(w => w && !['Shri', 'Smt', 'श्री', 'श्रीमती'].includes(w))
    .slice(0, 2)
    .map(w => Array.from(w)[0])
    .join('');
}
