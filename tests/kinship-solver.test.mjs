import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFamilyIndex } from '../src/data/familyData.js';
import { calculateKinship, solveComplexRelation } from '../src/utils/kinship.js';

/**
 * Rich multi-generational test fixture covering:
 * - 4+ generations of paternal & maternal lineage
 * - Elder/younger siblings (Tauji vs Chacha, Bhaiya vs Bhai)
 * - 1st cousins (Tayera, Chachera, Phuphera, Mamera, Mausera)
 * - 2nd cousins & once-removed cousins
 * - Paternal & maternal grand-uncles
 * - Marital relations: Jija, Sala, Sali, Bhabhi, Samdhi, Samdhan, multi-hop bridges
 * - Disconnected island node
 */
function createTestFamily() {
  const people = [
    // Gen 0: Great-grandparents (Paternal)
    { id: 'ggf_p', n: 'Raghav', hi: 'राघव', g: 'M' },
    { id: 'ggm_p', n: 'Sita', hi: 'सीता', g: 'F' },

    // Gen 1: Paternal grandparents + Paternal grand-uncle
    { id: 'gf_p', n: 'Harish', hi: 'हरीश', g: 'M' },
    { id: 'gm_p', n: 'Kamla', hi: 'कमला', g: 'F' },
    { id: 'guncle_p', n: 'Mahesh', hi: 'महेश', g: 'M' },
    { id: 'guncle_p_w', n: 'Radha', hi: 'राधा', g: 'F' },

    // Gen 1: Maternal great-grandparents & grandparents + Maternal grand-uncle
    { id: 'ggf_m', n: 'Brijesh', hi: 'बृजेश', g: 'M' },
    { id: 'ggm_m', n: 'Gita', hi: 'गीता', g: 'F' },
    { id: 'gf_m', n: 'Mohan', hi: 'मोहन', g: 'M' },
    { id: 'gm_m', n: 'Lata', hi: 'लता', g: 'F' },
    { id: 'guncle_m', n: 'Suresh', hi: 'सुरेश', g: 'M' },

    // Gen 2: Paternal uncles/aunt + Father + Mother + Maternal uncle/aunt
    { id: 'tau', n: 'Vikram', hi: 'विक्रम', g: 'M' },
    { id: 'tai', n: 'Sunita', hi: 'सुनीता', g: 'F' },
    { id: 'father', n: 'Rajesh', hi: 'राजेश', g: 'M' },
    { id: 'mother', n: 'Meena', hi: 'मीना', g: 'F' },
    { id: 'chacha', n: 'Anil', hi: 'अनील', g: 'M' },
    { id: 'chachi', n: 'Pooja', hi: 'पूजा', g: 'F' },
    { id: 'bua', n: 'Kavita', hi: 'कविता', g: 'F' },
    { id: 'phupha', n: 'Ramesh', hi: 'रमेश', g: 'M' },

    { id: 'mama', n: 'Deepak', hi: 'दीपक', g: 'M' },
    { id: 'mami', n: 'Neha', hi: 'नेहा', g: 'F' },
    { id: 'mausi', n: 'Seema', hi: 'सीमा', g: 'F' },
    { id: 'mausa', n: 'Alok', hi: 'आलोक', g: 'M' },

    // Gen 2: Paternal grand-uncle's child (Father's 1st cousin)
    { id: 'f_cousin', n: 'Prakash', hi: 'प्रकाश', g: 'M' },
    { id: 'f_cousin_w', n: 'Ritu', hi: 'रीतु', g: 'F' },

    // Gen 3: Ego + Siblings + Spouses + In-laws + Cousins
    { id: 'ego', n: 'Aarav', hi: 'आरव', g: 'M' },
    { id: 'wife', n: 'Priya', hi: 'प्रिया', g: 'F' },
    { id: 'wife_f', n: 'Dinesh', hi: 'दिनेश', g: 'M' },
    { id: 'wife_m', n: 'Asha', hi: 'आशा', g: 'F' },
    { id: 'sala', n: 'Karan', hi: 'करण', g: 'M' },
    { id: 'sali', n: 'Nisha', hi: 'निशा', g: 'F' },

    { id: 'ebro', n: 'Rohit', hi: 'रोहित', g: 'M' },
    { id: 'bhabhi', n: 'Swati', hi: 'स्वाति', g: 'F' },
    { id: 'ysis', n: 'Ananya', hi: 'अनन्या', g: 'F' },
    { id: 'jija', n: 'Nikhil', hi: 'निखिल', g: 'M' },
    { id: 'jija_f', n: 'Prem', hi: 'प्रेम', g: 'M' },
    { id: 'jija_m', n: 'Usha', hi: 'उषा', g: 'F' },

    { id: 'c_tau', n: 'Kabir', hi: 'कबीर', g: 'M' },
    { id: 'c_chacha', n: 'Rohan', hi: 'रोहन', g: 'M' },
    { id: 'c_bua', n: 'Sanya', hi: 'सान्या', g: 'F' },
    { id: 'c_mama', n: 'Varun', hi: 'वरुण', g: 'M' },
    { id: 'c_mausi', n: 'Tara', hi: 'तारा', g: 'F' },

    // Gen 3: 2nd cousin (grand-uncle's grandchild)
    { id: 'second_c', n: 'Dev', hi: 'देव', g: 'M' },
    { id: 'second_c_child', n: 'Reyansh', hi: 'रेयांश', g: 'M' },

    // Gen 4: Ego's children + Sister's children + Grandchildren
    { id: 'son', n: 'Vivaan', hi: 'विवान', g: 'M' },
    { id: 'bahu', n: 'Diya', hi: 'दिया', g: 'F' },
    { id: 'dau', n: 'Ira', hi: 'इरा', g: 'F' },
    { id: 'damad', n: 'Arjun', hi: 'अर्जुन', g: 'M' },
    { id: 'bhanja', n: 'Kunal', hi: 'कुणाल', g: 'M' },

    // Gen 5: Grandchildren (Pota vs Nati)
    { id: 'pota', n: 'Aryan', hi: 'आर्यन', g: 'M' },
    { id: 'nati', n: 'Ved', hi: 'वेद', g: 'M' },
    { id: 'natin', n: 'Myra', hi: 'मायरा', g: 'F' },

    // Gen 6: Great-grandchild & 4-gen descendant
    { id: 'parpota', n: 'Yug', hi: 'युग', g: 'M' },
    { id: 'gg_grandson', n: 'Om', hi: 'ओम', g: 'M' },

    // Disconnected island
    { id: 'stranger', n: 'Zoya', hi: 'ज़ोया', g: 'F' }
  ];

  const couples = [
    { h: 'ggf_p', w: 'ggm_p', kids: ['gf_p', 'guncle_p'] },
    { h: 'gf_p', w: 'gm_p', kids: ['tau', 'father', 'chacha', 'bua'] },
    { h: 'guncle_p', w: 'guncle_p_w', kids: ['f_cousin'] },
    { h: 'f_cousin', w: 'f_cousin_w', kids: ['second_c'] },
    { h: 'second_c', w: null, kids: ['second_c_child'] },

    { h: 'ggf_m', w: 'ggm_m', kids: ['gf_m', 'guncle_m'] },
    { h: 'gf_m', w: 'gm_m', kids: ['mama', 'mother', 'mausi'] },

    { h: 'tau', w: 'tai', kids: ['c_tau'] },
    { h: 'father', w: 'mother', kids: ['ebro', 'ego', 'ysis'] },
    { h: 'chacha', w: 'chachi', kids: ['c_chacha'] },
    { h: 'phupha', w: 'bua', kids: ['c_bua'] },
    { h: 'mama', w: 'mami', kids: ['c_mama'] },
    { h: 'mausa', w: 'mausi', kids: ['c_mausi'] },

    { h: 'wife_f', w: 'wife_m', kids: ['wife', 'sala', 'sali'] },
    { h: 'ego', w: 'wife', kids: ['son', 'dau'] },
    { h: 'ebro', w: 'bhabhi', kids: [] },
    { h: 'jija_f', w: 'jija_m', kids: ['jija'] },
    { h: 'jija', w: 'ysis', kids: ['bhanja'] },

    { h: 'son', w: 'bahu', kids: ['pota'] },
    { h: 'damad', w: 'dau', kids: ['nati', 'natin'] },
    { h: 'pota', w: null, kids: ['parpota'] },
    { h: 'parpota', w: null, kids: ['gg_grandson'] }
  ];

  return buildFamilyIndex({ people, couples });
}

test('direct relations & backward-compatible calculateKinship in en and hi', () => {
  const idx = createTestFamily();

  assert.deepEqual(calculateKinship(idx, 'ego', 'ego', 'en'), ['You', 'This is you']);
  assert.deepEqual(calculateKinship(idx, 'ego', 'ego', 'hi'), ['आप', 'यह आप हैं']);

  assert.deepEqual(calculateKinship(idx, 'ego', 'wife', 'en'), ['Patni', 'Wife']);
  assert.deepEqual(calculateKinship(idx, 'wife', 'ego', 'hi'), ['पति', 'पति']);

  assert.deepEqual(calculateKinship(idx, 'ego', 'father', 'en'), ['Papa', 'Father']);
  assert.deepEqual(calculateKinship(idx, 'ego', 'mother', 'hi'), ['माताजी', 'माता']);

  assert.deepEqual(calculateKinship(idx, 'ego', 'ebro', 'en'), ['Bhaiya', 'Elder brother']);
  assert.deepEqual(calculateKinship(idx, 'ego', 'ysis', 'en'), ['Behen', 'Younger sister']);

  assert.deepEqual(calculateKinship(idx, 'ego', 'tau', 'en'), ['Tauji', "Father's elder brother"]);
  assert.deepEqual(calculateKinship(idx, 'ego', 'chacha', 'en'), ['Chacha', "Father's younger brother"]);
  assert.deepEqual(calculateKinship(idx, 'ego', 'mama', 'en'), ['Mama', "Mother's brother"]);
  assert.deepEqual(calculateKinship(idx, 'ego', 'bua', 'en'), ['Bua', "Father's sister"]);
  assert.deepEqual(calculateKinship(idx, 'ego', 'mausi', 'hi'), ['मौसीजी', 'माता की बहन']);
});

test('Pota/Poti vs Nati/Natin distinction', () => {
  const idx = createTestFamily();

  const pota = solveComplexRelation(idx, 'ego', 'pota', 'en');
  assert.equal(pota.shortLabel, 'Pota');
  assert.equal(pota.isBlood, true);
  assert.equal(pota.lineageSide, 'paternal');
  assert.equal(pota.downSteps, 2);

  const nati = solveComplexRelation(idx, 'ego', 'nati', 'en');
  assert.equal(nati.shortLabel, 'Nati');
  assert.equal(nati.lineageSide, 'maternal');

  const natinHi = solveComplexRelation(idx, 'ego', 'natin', 'hi');
  assert.equal(natinHi.shortLabel, 'नातिन');
});

test('culturally exact 1st cousins (Tayera, Chachera, Phuphera, Mamera, Mausera)', () => {
  const idx = createTestFamily();

  const tayera = solveComplexRelation(idx, 'ego', 'c_tau', 'en');
  assert.equal(tayera.shortLabel, 'Tayera Bhai');
  assert.equal(tayera.lineageSide, 'paternal');
  assert.equal(tayera.degree, 1);
  assert.equal(tayera.commonAncestorId, 'gf_p');

  const chachera = solveComplexRelation(idx, 'ego', 'c_chacha', 'en');
  assert.equal(chachera.shortLabel, 'Chachera Bhai');

  const phuphera = solveComplexRelation(idx, 'ego', 'c_bua', 'en');
  assert.equal(phuphera.shortLabel, 'Phuphera Behen');
  assert.equal(phuphera.lineageSide, 'paternal');

  const mamera = solveComplexRelation(idx, 'ego', 'c_mama', 'en');
  assert.equal(mamera.shortLabel, 'Mamera Bhai');
  assert.equal(mamera.lineageSide, 'maternal');
  assert.equal(mamera.commonAncestorId, 'gf_m');

  const mauseraHi = solveComplexRelation(idx, 'ego', 'c_mausi', 'hi');
  assert.equal(mauseraHi.shortLabel, 'मौसेरी बहन');
  assert.equal(mauseraHi.lineageSide, 'maternal');
});

test('2nd cousins, once-removed cousins, and multi-gen ancestors/descendants', () => {
  const idx = createTestFamily();

  // 2nd cousin (up=3, down=3 via ggf_p)
  const secondCousin = solveComplexRelation(idx, 'ego', 'second_c', 'en');
  assert.equal(secondCousin.shortLabel, '2nd Cousin');
  assert.equal(secondCousin.isBlood, true);
  assert.equal(secondCousin.lineageSide, 'paternal');
  assert.equal(secondCousin.degree, 2);
  assert.equal(secondCousin.upSteps, 3);
  assert.equal(secondCousin.downSteps, 3);
  assert.equal(secondCousin.commonAncestorId, 'ggf_p');
  assert.equal(secondCousin.pathSteps.length, 6);

  // 2nd cousin once removed (up=3, down=4)
  const secondOnceRemoved = solveComplexRelation(idx, 'ego', 'second_c_child', 'en');
  assert.equal(secondOnceRemoved.shortLabel, '2nd Cousin once removed');
  assert.equal(secondOnceRemoved.degree, 2);
  assert.equal(secondOnceRemoved.upSteps, 3);
  assert.equal(secondOnceRemoved.downSteps, 4);

  // 1st cousin once removed (ego -> father -> gf_p -> guncle_p -> f_cousin: up=2, down=3? Wait: ego->father->gf_p->ggf_p (3) -> guncle_p (1) -> f_cousin (2): up=3, down=2 -> 1st cousin once removed!)
  const firstOnceRemoved = solveComplexRelation(idx, 'ego', 'f_cousin', 'en');
  assert.equal(firstOnceRemoved.shortLabel, '1st Cousin once removed');
  assert.equal(firstOnceRemoved.degree, 1);
  assert.equal(firstOnceRemoved.upSteps, 3);
  assert.equal(firstOnceRemoved.downSteps, 2);

  // Multi-gen descendant (4 hops down: ego -> son -> pota -> parpota -> gg_grandson)
  const multiDesc = solveComplexRelation(idx, 'ego', 'gg_grandson', 'en');
  assert.equal(multiDesc.isBlood, true);
  assert.equal(multiDesc.upSteps, 0);
  assert.equal(multiDesc.downSteps, 4);
  assert.equal(multiDesc.degree, 4);

  // Hindi 2nd cousin
  const secondCousinHi = solveComplexRelation(idx, 'ego', 'second_c', 'hi');
  assert.ok(secondCousinHi.shortLabel.includes('2वीं पीढ़ी'));
});

test('paternal and maternal grand-uncles', () => {
  const idx = createTestFamily();

  const patGrandUncle = solveComplexRelation(idx, 'ego', 'guncle_p', 'en');
  assert.equal(patGrandUncle.shortLabel, 'Paternal Grand-Uncle');
  assert.equal(patGrandUncle.isBlood, true);
  assert.equal(patGrandUncle.lineageSide, 'paternal');
  assert.equal(patGrandUncle.upSteps, 3);
  assert.equal(patGrandUncle.downSteps, 1);
  assert.equal(patGrandUncle.commonAncestorId, 'ggf_p');

  const matGrandUncle = solveComplexRelation(idx, 'ego', 'guncle_m', 'en');
  assert.equal(matGrandUncle.shortLabel, 'Maternal Grand-Uncle');
  assert.equal(matGrandUncle.lineageSide, 'maternal');
  assert.equal(matGrandUncle.commonAncestorId, 'ggf_m');

  const patGrandUncleHi = solveComplexRelation(idx, 'ego', 'guncle_p', 'hi');
  assert.equal(patGrandUncleHi.shortLabel, 'पैतृक ग्रैंड-अंकल');
});

test('marital & affinity relations: Jija, Sala, Sali, Bhabhi, Samdhi, Samdhan, and multi-hop BFS', () => {
  const idx = createTestFamily();

  const jija = solveComplexRelation(idx, 'ego', 'jija', 'en');
  assert.equal(jija.shortLabel, 'Jija');
  assert.equal(jija.isBlood, false);
  assert.equal(jija.lineageSide, 'marital');
  assert.ok(jija.pathSteps.length > 0);

  const sala = solveComplexRelation(idx, 'ego', 'sala', 'en');
  assert.equal(sala.shortLabel, 'Sala');
  assert.equal(sala.isBlood, false);

  const saliHi = solveComplexRelation(idx, 'ego', 'sali', 'hi');
  assert.equal(saliHi.shortLabel, 'सालीजी');

  const bhabhi = solveComplexRelation(idx, 'ego', 'bhabhi', 'en');
  assert.equal(bhabhi.shortLabel, 'Bhabhi');
  assert.equal(bhabhi.description, "Elder brother's wife");

  // Samdhi / Samdhan: father -> ego -> wife -> wife_f / wife_m
  const samdhi = solveComplexRelation(idx, 'father', 'wife_f', 'en');
  assert.equal(samdhi.shortLabel, 'Samdhi');
  assert.equal(samdhi.isBlood, false);
  assert.equal(samdhi.lineageSide, 'marital');

  const samdhanHi = solveComplexRelation(idx, 'father', 'wife_m', 'hi');
  assert.equal(samdhanHi.shortLabel, 'समधन');

  // Multi-hop marital bridge: father -> ego -> ysis -> jija -> jija_f (via child/spouse/parent)
  const multiHop = solveComplexRelation(idx, 'jija_f', 'wife_f', 'en');
  assert.equal(multiHop.isBlood, false);
  assert.equal(multiHop.lineageSide, 'marital');
  assert.ok(multiHop.pathSteps.length >= 4);
  assert.equal(multiHop.pathSteps[0].fromId, 'jija_f');
  assert.equal(multiHop.pathSteps[multiHop.pathSteps.length - 1].toId, 'wife_f');
});

test('disconnected nodes in en and hi', () => {
  const idx = createTestFamily();

  const discEn = solveComplexRelation(idx, 'ego', 'stranger', 'en');
  assert.equal(discEn.shortLabel, 'Not Related');
  assert.equal(discEn.isBlood, false);
  assert.equal(discEn.lineageSide, null);
  assert.equal(discEn.degree, null);
  assert.equal(discEn.commonAncestorId, null);
  assert.deepEqual(discEn.pathSteps, []);

  const discHi = solveComplexRelation(idx, 'ego', 'stranger', 'hi');
  assert.equal(discHi.shortLabel, 'कोई सीधा संबंध नहीं');
  assert.equal(discHi.description, 'परिवार में कोई जुड़ाव नहीं मिला');

  // Backward-compatible fallback for calculateKinship
  assert.deepEqual(calculateKinship(idx, 'ego', 'stranger', 'en'), ['Relative', 'Family member']);
});
