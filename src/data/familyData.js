/**
 * Public Demo Family Tree - "The Kapoor Family Lineage" (31 members across 5 generations)
 * Used as the default public demonstration dataset so no personal/private family data is shipped in the public bundle.
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
    createPerson('prithviraj', 'Prithviraj Kapoor', 'पृथ्वीराज कपूर', 'M', { late: true, dob: '1906-11-03' }),
    createPerson('ramsarni', 'Ramsarni Mehra', 'रामसरनी मेहरा', 'F', { late: true }),

    // Generation 1 — Sons & Spouses
    createPerson('raj', 'Raj Kapoor', 'राज कपूर', 'M', { late: true, dob: '1924-12-14' }),
    createPerson('krishna', 'Krishna Malhotra', 'कृष्णा मल्होत्रा', 'F', { late: true, dob: '1930-05-12' }),
    createPerson('shammi', 'Shammi Kapoor', 'शम्मी कपूर', 'M', { late: true, dob: '1931-10-21' }),
    createPerson('geeta', 'Geeta Bali', 'गीता बाली', 'F', { late: true, dob: '1930-11-30' }),
    createPerson('shashi', 'Shashi Kapoor', 'शशी कपूर', 'M', { late: true, dob: '1938-03-18' }),
    createPerson('jennifer', 'Jennifer Kendal', 'जेनिफर केंडल', 'F', { late: true, dob: '1933-02-28' }),

    // Generation 2 — Children of Raj, Shammi, Shashi + Spouses + In-Law Branches
    createPerson('randhir', 'Randhir Kapoor', 'रणधीर कपूर', 'M', { dob: '1947-02-15' }),
    createPerson('babita', 'Babita Shivdasani', 'बबीता शिवदासानी', 'F', { dob: '1947-04-20' }),
    createPerson('ritu', 'Ritu Nanda', 'ऋतु नंदा', 'F', { late: true, dob: '1948-10-30' }),
    createPerson('rajan', 'Rajan Nanda', 'राजन नंदा', 'M', { late: true, dob: '1942-05-24' }),
    createPerson('rishi', 'Rishi Kapoor', 'ऋषि कपूर', 'M', { late: true, dob: '1952-09-04' }),
    createPerson('neetu', 'Neetu Singh', 'नीतू सिंह', 'F', { dob: '1958-07-08' }),
    createPerson('rajiv', 'Rajiv Kapoor', 'राजीव कपूर', 'M', { late: true, dob: '1962-08-25' }),
    createPerson('aditya', 'Aditya Raj Kapoor', 'आदित्य राज कपूर', 'M', { dob: '1956-07-01' }),
    createPerson('kunal', 'Kunal Kapoor', 'कुणाल कपूर', 'M', { dob: '1959-09-29' }),
    createPerson('sanjana', 'Sanjana Kapoor', 'संजना कपूर', 'F', { dob: '1967-11-27' }),

    // In-law Branch: Neetu Singh's Parents
    createPerson('darshan', 'Darshan Singh', 'दर्शन सिंह', 'M', { late: true }),
    createPerson('raji', 'Rajee Kaur', 'राजी कौर', 'F', { late: true }),

    // In-law Branch: Alia Bhatt's Parents
    createPerson('mahesh', 'Mahesh Bhatt', 'महेश भट्ट', 'M', { dob: '1948-09-20' }),
    createPerson('soni', 'Soni Razdan', 'सोनी राजदान', 'F', { dob: '1956-10-25' }),

    // Generation 3 — Grandchildren & Spouses
    createPerson('karisma', 'Karisma Kapoor', 'करिश्मा कपूर', 'F', { dob: '1974-06-25' }),
    createPerson('kareena', 'Kareena Kapoor', 'करीना कपूर', 'F', { dob: '1980-09-21' }),
    createPerson('saif', 'Saif Ali Khan', 'सैफ अली खान', 'M', { dob: '1970-08-16' }),
    createPerson('riddhima', 'Riddhima Kapoor Sahni', 'रिद्धिमा कपूर साहनी', 'F', { dob: '1980-09-15' }),
    createPerson('ranbir', 'Ranbir Kapoor', 'रणबीर कपूर', 'M', { dob: '1982-09-28' }),
    createPerson('alia', 'Alia Bhatt', 'आलिया भट्ट', 'F', { dob: '1993-03-15' }),

    // Generation 4 — Great-Grandchildren
    createPerson('taimur', 'Taimur Ali Khan', 'तैमूर अली खान', 'M', { dob: '2016-12-20' }),
    createPerson('jeh', 'Jehangir Ali Khan', 'जेहंगीर अली खान', 'M', { dob: '2021-02-21' }),
    createPerson('raha', 'Raha Kapoor', 'राहा कपूर', 'F', { dob: '2022-11-06' })
  ],
  couples: [
    { h: 'prithviraj', w: 'ramsarni', kids: ['raj', 'shammi', 'shashi'] },
    { h: 'raj', w: 'krishna', kids: ['randhir', 'ritu', 'rishi', 'rajiv'] },
    { h: 'shammi', w: 'geeta', kids: ['aditya'] },
    { h: 'shashi', w: 'jennifer', kids: ['kunal', 'sanjana'] },
    { h: 'randhir', w: 'babita', kids: ['karisma', 'kareena'] },
    { h: 'rajan', w: 'ritu', kids: [] },
    { h: 'rishi', w: 'neetu', kids: ['riddhima', 'ranbir'] },
    { h: 'darshan', w: 'raji', kids: ['neetu'] },
    { h: 'saif', w: 'kareena', kids: ['taimur', 'jeh'] },
    { h: 'ranbir', w: 'alia', kids: ['raha'] },
    { h: 'mahesh', w: 'soni', kids: ['alia'] }
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
    .filter(w => w && !['Gupta', 'Sharma', 'Shri', 'गुप्ता', 'शर्मा', 'श्री'].includes(w))
    .slice(0, 2)
    .map(w => Array.from(w)[0])
    .join('');
}
