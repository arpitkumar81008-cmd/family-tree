/**
 * Dual-Mode Family Tree Spatial Layout Engine.
 * Mode 1: Top-Down Central Lineage with Aside Spouse Subtrees
 * Mode 2: Directional Sequential Flowchart (Focal perspective with left-branching paternal line & brothers)
 */

export function computeTreeLayout(data, cardHeight = 138, lang = "en", viewerId = "") {
  const CARD_W = 96, COUPLE_GAP = 16, SIBLING_GAP = 20, SECTOR_GAP = 60, TREE_GAP = 60, ROW_GAP = 84, TOP_PAD = 50, LEFT_PAD = 80;
  let { people, couples } = data;
  if (!people || !people.length) return { pos: {}, W: 320, H: 200, path: "", guideLines: "", genLabels: [], branchLabels: [] };

  let byId = {};
  people.forEach(p => byId[p.id] = p);
  let spouse = {}, parents = {}, children = {}, cok = {};
  couples.forEach(c => {
    if (c.h && c.w) { spouse[c.h] = c.w; spouse[c.w] = c.h; }
    if (c.h) children[c.h] = c.kids || [];
    if (c.w) children[c.w] = c.kids || [];
    (c.kids || []).forEach(k => {
      parents[k] = [c.h, c.w].filter(Boolean);
      cok[k] = c;
    });
  });

  const parOf = id => parents[id] || [];
  const kidsOf = id => children[id] || [];
  const sibsOf = id => {
    let pars = parOf(id);
    if (!pars.length) return [];
    let pKids = kidsOf(pars[0]);
    return pKids.filter(k => k !== id);
  };

  if (viewerId && byId[viewerId]) {
    return layoutDirectionalFlowchart(viewerId);
  }
  return layoutTopDown();

  // =========================================================================
  // MODE 1: CENTRAL MAIN LINEAGE WITH ASIDE SPOUSE BRANCHES (TOP-DOWN)
  // =========================================================================
  function layoutTopDown() {
    let childToCouple = new Map();
    couples.forEach(c => {
      (c.kids || []).forEach(k => childToCouple.set(k, c));
    });

    // 1. Identify Main Patriarch (Badri Prasad or topmost ancestor)
    let mainPatriarchId = byId['badri'] ? 'badri' : (people[0]?.id || '');
    if (mainPatriarchId) {
      let cur = mainPatriarchId;
      let visitedUp = new Set();
      while (cur && childToCouple.has(cur) && !visitedUp.has(cur)) {
        visitedUp.add(cur);
        let pc = childToCouple.get(cur);
        cur = pc.h || pc.w;
        if (cur && byId[cur]) mainPatriarchId = cur;
      }
    }

    // 2. Compute Main Branch Blood Descendants
    let mainDescendants = new Set();
    if (mainPatriarchId) {
      mainDescendants.add(mainPatriarchId);
      let patCouple = couples.find(c => c.h === mainPatriarchId || c.w === mainPatriarchId);
      if (patCouple) {
        if (patCouple.h) mainDescendants.add(patCouple.h);
        if (patCouple.w) mainDescendants.add(patCouple.w);
      }
    }

    let added = true;
    while (added) {
      added = false;
      couples.forEach(c => {
        let isMain = (c.h && mainDescendants.has(c.h)) || (c.w && mainDescendants.has(c.w));
        if (isMain) {
          (c.kids || []).forEach(k => {
            if (!mainDescendants.has(k)) {
              mainDescendants.add(k);
              added = true;
            }
          });
        }
      });
    }

    // 3. Partition couples into Main Branch vs Spouse Branches
    let mainCouples = [];
    let spouseCouples = [];
    couples.forEach(c => {
      let isMain = (c.h && mainDescendants.has(c.h)) || (c.w && mainDescendants.has(c.w));
      if (isMain) mainCouples.push(c);
      else spouseCouples.push(c);
    });

    let personMainCouple = new Map();
    mainCouples.forEach(c => {
      if (c.h) personMainCouple.set(c.h, c);
      if (c.w) personMainCouple.set(c.w, c);
    });

    // 4. Compute depths for Main Tree
    let depthMap = new Map();
    let mainTopCouples = mainCouples.filter(c => {
      let hHas = c.h && childToCouple.has(c.h);
      let wHas = c.w && childToCouple.has(c.w);
      return !hHas && !wHas;
    });

    mainTopCouples.forEach(c => depthMap.set(c, 0));
    let changed = true;
    for (let iter = 0; iter < 10 && changed; iter++) {
      changed = false;
      mainCouples.forEach(c => {
        let curD = depthMap.get(c);
        if (curD === undefined) return;
        (c.kids || []).forEach(k => {
          let kc = personMainCouple.get(k);
          let target = kc || k;
          let existingD = depthMap.get(target);
          if (existingD === undefined || existingD < curD + 1) {
            depthMap.set(target, curD + 1);
            changed = true;
          }
        });
      });
    }

    mainCouples.forEach(c => {
      let d = depthMap.get(c) || 0;
      if (c.h) depthMap.set(c.h, d);
      if (c.w) depthMap.set(c.w, d);
    });

    // 5. Subtree Widths for Tree (Handles both Main Lineage & In-Law Subtrees!)
    let personToCouple = new Map();
    couples.forEach(c => {
      if (c.h) personToCouple.set(c.h, c);
      if (c.w) personToCouple.set(c.w, c);
    });

    let nodeSubtreeWidth = new Map();
    function calcSubtree(item, visitedItems = new Set()) {
      if (visitedItems.has(item)) {
        let fallbackW = typeof item === 'string'
          ? CARD_W
          : ((item.h && item.w) ? CARD_W * 2 + COUPLE_GAP : CARD_W);
        nodeSubtreeWidth.set(item, fallbackW);
        return fallbackW;
      }
      let nextVisited = new Set(visitedItems);
      nextVisited.add(item);

      if (typeof item === 'string') {
        let pId = item;
        let c = personToCouple.get(pId);
        if (c && (c.kids?.length || (c.h && c.w))) {
          let w = calcSubtree(c, nextVisited);
          nodeSubtreeWidth.set(pId, w);
          return w;
        }
        let w = CARD_W;
        nodeSubtreeWidth.set(pId, w);
        return w;
      } else {
        let c = item;
        let unitW = (c.h && c.w) ? CARD_W * 2 + COUPLE_GAP : CARD_W;
        let kids = c.kids || [];
        if (!kids.length) {
          nodeSubtreeWidth.set(c, unitW);
          return unitW;
        }
        let childItems = [];
        let visited = new Set();
        kids.forEach(k => {
          let kc = personToCouple.get(k);
          if (kc && (kc.kids?.length || (kc.h && kc.w))) {
            if (!visited.has(kc)) {
              visited.add(kc);
              childItems.push(kc);
            }
          } else {
            childItems.push(k);
          }
        });

        let totalChildW = 0;
        childItems.forEach((ci, idx) => {
          let cw = calcSubtree(ci, nextVisited);
          totalChildW += cw;
          if (idx > 0) totalChildW += SIBLING_GAP;
        });

        let w = Math.max(unitW, totalChildW);
        nodeSubtreeWidth.set(c, w);
        return w;
      }
    }

    mainTopCouples.forEach(c => calcSubtree(c));

    // 6. Position Main Tree in the Center
    let pos = {};
    let placedCards = [];

    function positionSubtree(item, leftX, depth, visitedItems = new Set()) {
      if (visitedItems.has(item)) return;
      let nextVisited = new Set(visitedItems);
      nextVisited.add(item);

      let rowY = TOP_PAD + depth * (cardHeight + ROW_GAP);
      let subW = nodeSubtreeWidth.get(item) || CARD_W;

      if (typeof item === 'string') {
        let pId = item;
        let c = personMainCouple.get(pId);
        if (c) return positionSubtree(c, leftX, depth, nextVisited);
        let cardX = leftX + (subW - CARD_W) / 2;
        pos[pId] = { x: cardX, y: rowY };
        placedCards.push({ id: pId, x: cardX, y: rowY });
      } else {
        let c = item;
        let unitW = (c.h && c.w) ? CARD_W * 2 + COUPLE_GAP : CARD_W;
        let unitLeftX = leftX + (subW - unitW) / 2;

        if (c.h && c.w) {
          pos[c.h] = { x: unitLeftX, y: rowY };
          pos[c.w] = { x: unitLeftX + CARD_W + COUPLE_GAP, y: rowY };
          placedCards.push({ id: c.h, x: unitLeftX, y: rowY });
          placedCards.push({ id: c.w, x: unitLeftX + CARD_W + COUPLE_GAP, y: rowY });
        } else if (c.h) {
          pos[c.h] = { x: unitLeftX, y: rowY };
          placedCards.push({ id: c.h, x: unitLeftX, y: rowY });
        } else if (c.w) {
          pos[c.w] = { x: unitLeftX, y: rowY };
          placedCards.push({ id: c.w, x: unitLeftX, y: rowY });
        }

        let kids = c.kids || [];
        if (kids.length) {
          let childItems = [];
          let visited = new Set();
          kids.forEach(k => {
            let kc = personMainCouple.get(k);
            if (kc) {
              if (!visited.has(kc)) {
                visited.add(kc);
                childItems.push(kc);
              }
            } else {
              childItems.push(k);
            }
          });

          let totalChildW = 0;
          childItems.forEach((ci, idx) => {
            totalChildW += (nodeSubtreeWidth.get(ci) || CARD_W);
            if (idx > 0) totalChildW += SIBLING_GAP;
          });

          let curKidX = leftX + (subW - totalChildW) / 2;
          childItems.forEach(ci => {
            let cw = nodeSubtreeWidth.get(ci) || CARD_W;
            positionSubtree(ci, curKidX, depth + 1, nextVisited);
            curKidX += cw + SIBLING_GAP;
          });
        }
      }
    }

    let rootX = LEFT_PAD;
    mainTopCouples.forEach(c => {
      let sw = nodeSubtreeWidth.get(c) || CARD_W;
      positionSubtree(c, rootX, depthMap.get(c) || 0);
      rootX += sw + SECTOR_GAP;
    });

    let mainTreeMaxX = placedCards.length ? Math.max(...placedCards.map(c => c.x + CARD_W)) : LEFT_PAD;
    let mainTreeMinX = placedCards.length ? Math.min(...placedCards.map(c => c.x)) : LEFT_PAD;

    // 7. Compute Depths for Spouse Branches
    changed = true;
    for (let iter = 0; iter < 10 && changed; iter++) {
      changed = false;
      spouseCouples.forEach(sc => {
        if (depthMap.has(sc)) return;

        let linkedChildId = (sc.kids || []).find(k => depthMap.has(k) || (pos[k] && depthMap.has(pos[k])));
        if (linkedChildId) {
          let childD = depthMap.get(linkedChildId);
          if (childD === undefined && pos[linkedChildId]) {
            childD = Math.round((pos[linkedChildId].y - TOP_PAD) / (cardHeight + ROW_GAP));
          }
          if (childD !== undefined) {
            let scD = Math.max(0, childD - 1);
            depthMap.set(sc, scD);
            if (sc.h) depthMap.set(sc.h, scD);
            if (sc.w) depthMap.set(sc.w, scD);
            changed = true;
            return;
          }
        }

        let parentCoupleH = sc.h && childToCouple.get(sc.h);
        let parentCoupleW = sc.w && childToCouple.get(sc.w);
        let parentCouple = parentCoupleH || parentCoupleW;
        if (parentCouple && depthMap.has(parentCouple)) {
          let scD = depthMap.get(parentCouple) + 1;
          depthMap.set(sc, scD);
          if (sc.h) depthMap.set(sc.h, scD);
          if (sc.w) depthMap.set(sc.w, scD);
          changed = true;
          return;
        }
      });
    }

    spouseCouples.forEach(sc => {
      if (!depthMap.has(sc)) {
        depthMap.set(sc, 2);
        if (sc.h) depthMap.set(sc.h, 2);
        if (sc.w) depthMap.set(sc.w, 2);
      }
    });

    // 8. Position Spouse Branches Hierarchically as Trees!
    let branchLabels = [];
    let mainPatriarchPerson = mainPatriarchId ? byId[mainPatriarchId] : null;
    let mainBranchLabelText = mainPatriarchPerson && mainPatriarchId !== 'badri'
      ? (lang === 'hi'
          ? `★ मुख्य वंश (${mainPatriarchPerson.hi || mainPatriarchPerson.name} कुल)`
          : `★ Main Family Branch (${mainPatriarchPerson.name} Lineage)`)
      : (lang === 'hi' ? '★ मुख्य वंश (बद्री प्रसाद कुल)' : '★ Main Family Branch (Badri Prasad Lineage)');
    branchLabels.push({
      text: mainBranchLabelText,
      x: mainTreeMinX,
      y: TOP_PAD - 32
    });

    let personSpouseCouple = new Map();
    spouseCouples.forEach(c => {
      if (c.h) personSpouseCouple.set(c.h, c);
      if (c.w) personSpouseCouple.set(c.w, c);
    });

    let spousePersonsWithParentsInSpouse = new Set();
    spouseCouples.forEach(sc => {
      (sc.kids || []).forEach(k => spousePersonsWithParentsInSpouse.add(k));
    });

    let inLawRootCouples = spouseCouples.filter(sc => {
      let hHasParent = sc.h && spousePersonsWithParentsInSpouse.has(sc.h);
      let wHasParent = sc.w && spousePersonsWithParentsInSpouse.has(sc.w);
      return !hHasParent && !wHasParent;
    });
    if (!inLawRootCouples.length) inLawRootCouples = [...spouseCouples];

    inLawRootCouples.forEach(rc => calcSubtree(rc));

    let spouseStartX = mainTreeMaxX + SECTOR_GAP;

    function positionInLawSubtree(item, leftX, depth, visitedItems = new Set()) {
      if (visitedItems.has(item)) return;
      let nextVisited = new Set(visitedItems);
      nextVisited.add(item);

      let rowY = TOP_PAD + depth * (cardHeight + ROW_GAP);
      if (typeof item === 'string') {
        let pId = item;
        let c = personSpouseCouple.get(pId);
        if (c && !pos[c.h || c.w]) return positionInLawSubtree(c, leftX, depth, nextVisited);
        if (!pos[pId]) {
          let sw = nodeSubtreeWidth.get(pId) || CARD_W;
          let cardX = leftX + (sw - CARD_W) / 2;
          pos[pId] = { x: cardX, y: rowY };
          placedCards.push({ id: pId, x: cardX, y: rowY });
        }
      } else {
        let c = item;
        let sw = nodeSubtreeWidth.get(c) || CARD_W;
        let unitW = (c.h && c.w) ? CARD_W * 2 + COUPLE_GAP : CARD_W;
        let coupleLeftX = leftX + (sw - unitW) / 2;

        if (c.h && c.w) {
          if (!pos[c.h]) {
            pos[c.h] = { x: coupleLeftX, y: rowY };
            placedCards.push({ id: c.h, x: coupleLeftX, y: rowY });
          }
          if (!pos[c.w]) {
            pos[c.w] = { x: coupleLeftX + CARD_W + COUPLE_GAP, y: rowY };
            placedCards.push({ id: c.w, x: coupleLeftX + CARD_W + COUPLE_GAP, y: rowY });
          }
        } else if (c.h && !pos[c.h]) {
          pos[c.h] = { x: coupleLeftX, y: rowY };
          placedCards.push({ id: c.h, x: coupleLeftX, y: rowY });
        } else if (c.w && !pos[c.w]) {
          pos[c.w] = { x: coupleLeftX, y: rowY };
          placedCards.push({ id: c.w, x: coupleLeftX, y: rowY });
        }

        let kids = (c.kids || []).filter(kId => !mainDescendants.has(kId) && !personMainCouple.has(kId));
        if (kids.length) {
          let childItems = [];
          let visited = new Set();
          kids.forEach(k => {
            let kc = personSpouseCouple.get(k);
            if (kc) {
              if (!visited.has(kc)) {
                visited.add(kc);
                childItems.push(kc);
              }
            } else {
              childItems.push(k);
            }
          });

          let totalChildW = 0;
          childItems.forEach((child, idx) => {
            totalChildW += nodeSubtreeWidth.get(child) || CARD_W;
            if (idx > 0) totalChildW += SIBLING_GAP;
          });

          let curChildLeft = leftX + (sw - totalChildW) / 2;
          childItems.forEach(child => {
            let cw = nodeSubtreeWidth.get(child) || CARD_W;
            positionInLawSubtree(child, curChildLeft, depth + 1, nextVisited);
            curChildLeft += cw + SIBLING_GAP;
          });
        }
      }
    }

    inLawRootCouples.forEach(rc => {
      let rcDepth = depthMap.get(rc) !== undefined ? depthMap.get(rc) : 1;
      let rcSubtreeW = nodeSubtreeWidth.get(rc) || (CARD_W * 2 + COUPLE_GAP);

      positionInLawSubtree(rc, spouseStartX, rcDepth);

      let branchTitle = lang === 'hi' ? '✦ ससुराल पक्ष (मायका)' : "✦ In-Law Family Branch";
      let linkedSpouseId = (rc.kids || []).find(k => mainDescendants.has(k) || personMainCouple.has(k));
      let linkedPerson = (linkedSpouseId && byId[linkedSpouseId]) || people.find(p => p.id === 'minal');
      if (linkedPerson) {
        branchTitle = lang === 'hi'
          ? (linkedPerson.hi || linkedPerson.name) + ' का मायका (ससुराल पक्ष)'
          : linkedPerson.name + "'s Family (In-laws)";
      }

      branchLabels.push({
        text: branchTitle,
        x: spouseStartX,
        y: TOP_PAD + rcDepth * (cardHeight + ROW_GAP) - 30
      });

      spouseStartX += rcSubtreeW + SECTOR_GAP;
    });

    // Fallback for any other individual
    people.forEach(p => {
      if (!pos[p.id]) {
        let maxPlacedX = placedCards.length ? Math.max(...placedCards.map(c => c.x)) : LEFT_PAD;
        pos[p.id] = { x: maxPlacedX + CARD_W + SIBLING_GAP, y: TOP_PAD };
        placedCards.push({ id: p.id, x: pos[p.id].x, y: TOP_PAD });
      }
    });

    // Universal Non-Collision Pass: Guarantees gap >= SIBLING_GAP for every card on every row!
    let byRowMap = new Map();
    placedCards.forEach(c => {
      let y = pos[c.id].y;
      if (!byRowMap.has(y)) byRowMap.set(y, []);
      byRowMap.get(y).push(c);
    });
    byRowMap.forEach(cardsOnRow => {
      cardsOnRow.sort((a, b) => pos[a.id].x - pos[b.id].x);
      for (let i = 0; i < cardsOnRow.length - 1; i++) {
        let cur = cardsOnRow[i];
        let next = cardsOnRow[i + 1];
        let minNextX = pos[cur.id].x + CARD_W + SIBLING_GAP;
        if (pos[next.id].x < minNextX) {
          let shift = minNextX - pos[next.id].x;
          for (let j = i + 1; j < cardsOnRow.length; j++) {
            pos[cardsOnRow[j].id].x += shift;
          }
        }
      }
    });

    // 9. SVG Connector Lines (Main Branch vs Other In-Law Branch Lines)
    let mainPath = '';
    let otherPath = '';
    let bridgePath = '';

    // Couple lines (strictly adjacent only!)
    couples.forEach(c => {
      if (c.h && c.w && pos[c.h] && pos[c.w]) {
        let hPos = pos[c.h], wPos = pos[c.w];
        if (hPos.y === wPos.y) {
          let leftP = hPos.x < wPos.x ? hPos : wPos;
          let rightP = hPos.x < wPos.x ? wPos : hPos;
          let gap = rightP.x - (leftP.x + CARD_W);
          if (gap >= 0 && gap <= COUPLE_GAP + 12) {
            let d = `M${leftP.x + CARD_W} ${leftP.y + 34}H${rightP.x} `;
            let isMainCouple = mainCouples.some(mc => (mc.h === c.h && mc.w === c.w) || (mc.h === c.w && mc.w === c.h));
            if (isMainCouple) {
              mainPath += d;
            } else {
              otherPath += d;
            }
          }
        }
      }
    });

    // Main branch parent-to-child lines
    mainCouples.forEach(c => {
      let kids = c.kids || [];
      if (!kids.length) return;
      let parentCxs = [];
      let parentY = 0;
      if (c.h && pos[c.h]) { parentCxs.push(pos[c.h].x + CARD_W / 2); parentY = pos[c.h].y; }
      if (c.w && pos[c.w]) { parentCxs.push(pos[c.w].x + CARD_W / 2); parentY = pos[c.w].y; }
      if (!parentCxs.length) return;

      let parentMidX = (Math.min(...parentCxs) + Math.max(...parentCxs)) / 2;
      let kidCxs = [];
      let kidTopY = null;
      kids.forEach(kId => {
        if (pos[kId]) {
          kidCxs.push(pos[kId].x + CARD_W / 2);
          if (kidTopY === null) kidTopY = pos[kId].y;
        }
      });
      if (!kidCxs.length) return;

      let dropStartY = (c.h && c.w) ? parentY + 34 : parentY + cardHeight;
      let busY = parentY + cardHeight + ROW_GAP / 2;

      mainPath += `M${parentMidX} ${dropStartY}V${busY} `;
      mainPath += `M${Math.min(...kidCxs, parentMidX)} ${busY}H${Math.max(...kidCxs, parentMidX)} `;
      kidCxs.forEach(cx => {
        mainPath += `M${cx} ${busY}V${kidTopY} `;
      });
    });

    // Spouse branch parent-to-child & connecting line to the spouse in main branch!
    spouseCouples.forEach(sc => {
      let parentCxs = [];
      let parentY = 0;
      if (sc.h && pos[sc.h]) { parentCxs.push(pos[sc.h].x + CARD_W / 2); parentY = pos[sc.h].y; }
      if (sc.w && pos[sc.w]) { parentCxs.push(pos[sc.w].x + CARD_W / 2); parentY = pos[sc.w].y; }
      if (!parentCxs.length) return;

      let parentMidX = (Math.min(...parentCxs) + Math.max(...parentCxs)) / 2;
      let dropStartY = (sc.h && sc.w) ? parentY + 34 : parentY + cardHeight;
      let busY = parentY + cardHeight + ROW_GAP / 2;

      let unplacedKids = (sc.kids || []).filter(k => pos[k] && !mainDescendants.has(k) && !personMainCouple.has(k));
      let inBranchKidCxs = unplacedKids.map(kId => pos[kId].x + CARD_W / 2);

      if (inBranchKidCxs.length) {
        otherPath += `M${parentMidX} ${dropStartY}V${busY} `;
        otherPath += `M${Math.min(...inBranchKidCxs, parentMidX)} ${busY}H${Math.max(...inBranchKidCxs, parentMidX)} `;
        let kidTopY = pos[unplacedKids[0]].y;
        inBranchKidCxs.forEach(cx => {
          otherPath += `M${cx} ${busY}V${kidTopY} `;
        });
      } else {
        otherPath += `M${parentMidX} ${dropStartY}V${busY} `;
      }

      // Connecting line from spouse branch bus across to the married spouse in the main branch!
      let linkedChildId = (sc.kids || []).find(k => pos[k] && (mainDescendants.has(k) || personMainCouple.has(k) || k === 'minal'));
      if (linkedChildId && pos[linkedChildId]) {
        let spousePos = pos[linkedChildId];
        let spouseCx = spousePos.x + CARD_W / 2;
        let spouseTopY = spousePos.y;

        let connectBusY = busY - 14;
        bridgePath += `M${parentMidX} ${busY}V${connectBusY} `;
        bridgePath += `M${parentMidX} ${connectBusY}H${spouseCx} `;
        bridgePath += `M${spouseCx} ${connectBusY}V${spouseTopY} `;
      }
    });

    let maxW = 0, maxH = 0;
    Object.values(pos).forEach(p => {
      if (p.x + CARD_W > maxW) maxW = p.x + CARD_W;
      if (p.y + cardHeight > maxH) maxH = p.y + cardHeight;
    });

    let maxGen = 0;
    depthMap.forEach(d => { if (d > maxGen) maxGen = d; });

    let genLabels = [];
    let guideLines = '';
    for (let g = 0; g <= maxGen; g++) {
      let rowY = TOP_PAD + g * (cardHeight + ROW_GAP);
      let labelY = rowY + cardHeight / 2 - 12;
      let labelText = lang === 'hi' ? `पीढ़ी ${g}` : `Gen ${g}`;
      genLabels.push({ g, y: rowY, labelY, labelText });
      guideLines += `M${LEFT_PAD - 40} ${rowY - 20}H${maxW + 40} `;
    }

    return {
      pos,
      W: Math.max(maxW + 80, 800),
      H: Math.max(maxH + 80, 600),
      path: mainPath + otherPath + bridgePath,
      mainPath,
      otherPath,
      bridgePath,
      guideLines,
      genLabels,
      branchLabels,
      mainMidX: (mainTreeMinX + mainTreeMaxX) / 2
    };
  }

  // =========================================================================
  // MODE 2: DIRECTIONAL SEQUENTIAL FLOWCHART (VIEW TREE FROM THIS CARD)
  // =========================================================================
  function layoutDirectionalFlowchart(fId) {
    let focusPerson = byId[fId];
    let spouseId = spouse[fId];
    let spousePerson = spouseId ? byId[spouseId] : null;

    let pos = {};
    let placedRects = [];
    let branchLabels = [];

    function canPlace(x, y, w, h) {
      for (let r of placedRects) {
        let xOverlap = Math.max(0, Math.min(x + w, r.x + r.w) - Math.max(x, r.x));
        let yOverlap = Math.max(0, Math.min(y + h, r.y + r.h) - Math.max(y, r.y));
        if (xOverlap > 0 && yOverlap > 0) return false;
      }
      return true;
    }

    function markCard(id, x, y) {
      pos[id] = { x, y };
      placedRects.push({ id, x, y, w: CARD_W, h: cardHeight });
    }

    // Trace ancestors chain
    function getAncestryChain(id) {
      let chain = [];
      let curId = id;
      let visited = new Set();
      while (curId && byId[curId] && !visited.has(curId)) {
        visited.add(curId);
        let pars = parOf(curId);
        if (!pars.length) break;
        let dadId = pars.find(p => byId[p]?.g === 'M');
        let momId = pars.find(p => byId[p]?.g === 'F');
        let primary = dadId || pars[0];
        let sp = momId || (primary ? spouse[primary] : null);
        let sibs = primary ? sibsOf(primary) : [];
        chain.push({
          id: primary,
          spouseId: sp,
          childId: curId,
          sibs
        });
        curId = primary;
      }
      return chain;
    }

    let paternalChain = getAncestryChain(fId);
    let fPars = parOf(fId);
    let fMomId = fPars.find(p => byId[p]?.g === 'F');
    let maternalChain = fMomId ? getAncestryChain(fMomId) : [];
    let spouseChain = spouseId ? getAncestryChain(spouseId) : [];

    let maxAncLevels = Math.max(paternalChain.length, maternalChain.length, spouseChain.length, 1);
    let focalY = TOP_PAD + maxAncLevels * (cardHeight + ROW_GAP);

    // Measure space needed on left for paternal ancestry
    let patTotalW = 0;
    paternalChain.forEach(step => {
      let unitW = step.spouseId ? CARD_W * 2 + COUPLE_GAP : CARD_W;
      let sibW = step.sibs.length * (CARD_W + SIBLING_GAP);
      let sibKidsW = 0;
      (step.sibs || []).forEach(sibId => {
        let sk = kidsOf(sibId);
        sibKidsW += sk.length * (CARD_W + SIBLING_GAP);
      });
      patTotalW = Math.max(patTotalW, unitW + sibW + sibKidsW);
    });

    let patStepX = CARD_W + 60;
    let focalX = LEFT_PAD + Math.max(patTotalW + 100, paternalChain.length * patStepX + 120);
    let focalUnitW = spousePerson ? CARD_W * 2 + COUPLE_GAP : CARD_W;
    let spouseX = focalX + CARD_W + COUPLE_GAP;
    let focalCx = focalX + focalUnitW / 2;

    // 1. Place Focus Person & Spouse
    markCard(fId, focalX, focalY);
    if (spousePerson) {
      markCard(spouseId, spouseX, focalY);
    }

    branchLabels.push({
      text: lang === 'hi' ? '★ मुख्य व्यक्ति' : '★ Focus Person',
      x: focalX,
      y: focalY - 22
    });

    // 2. Focus Siblings (Sideways to the LEFT of Focus Person's card!)
    let fSibs = sibsOf(fId);
    let sibLeftEdge = focalX - SIBLING_GAP;
    fSibs.forEach(sibId => {
      if (byId[sibId] && !pos[sibId]) {
        let sSpId = spouse[sibId];
        let sHasSp = sSpId && byId[sSpId] && !pos[sSpId];
        let sUnitW = sHasSp ? CARD_W * 2 + COUPLE_GAP : CARD_W;
        let placeX = sibLeftEdge - sUnitW;
        while (!canPlace(placeX, focalY, sUnitW, cardHeight)) {
          placeX -= SIBLING_GAP;
        }
        markCard(sibId, placeX, focalY);
        if (sHasSp) {
          markCard(sSpId, placeX + CARD_W + COUPLE_GAP, focalY);
        }
        sibLeftEdge = placeX - SIBLING_GAP;

        // Place siblings' children directly under them on the descendants row!
        let sibKids = kidsOf(sibId);
        if (sibKids.length) {
          let skRowY = focalY + cardHeight + ROW_GAP;
          let skTotalW = sibKids.length * CARD_W + (sibKids.length - 1) * SIBLING_GAP;
          let skStartX = placeX + sUnitW / 2 - skTotalW / 2;
          while (!canPlace(skStartX, skRowY, skTotalW, cardHeight)) {
            skStartX -= SIBLING_GAP;
          }
          sibKids.forEach((skId, skIdx) => {
            if (byId[skId] && !pos[skId]) {
              markCard(skId, skStartX + skIdx * (CARD_W + SIBLING_GAP), skRowY);
            }
          });
        }
      }
    });

    // 3. Paternal Ancestors (Upper-Left ↖)
    paternalChain.forEach((step, idx) => {
      let level = idx + 1;
      let rowY = focalY - level * (cardHeight + ROW_GAP);
      let unitW = step.spouseId ? CARD_W * 2 + COUPLE_GAP : CARD_W;
      let targetX = focalX - level * patStepX;

      while (!canPlace(targetX, rowY, unitW, cardHeight)) {
        targetX -= 20;
      }

      markCard(step.id, targetX, rowY);
      if (step.spouseId && byId[step.spouseId] && !pos[step.spouseId]) {
        markCard(step.spouseId, targetX + CARD_W + COUPLE_GAP, rowY);
      }

      // Ancestor's siblings branching towards the LEFT
      let sibEdgeX = targetX - SIBLING_GAP;
      (step.sibs || []).forEach(sibId => {
        if (byId[sibId] && !pos[sibId]) {
          let sSpId = spouse[sibId];
          let sHasSp = sSpId && byId[sSpId] && !pos[sSpId];
          let sUnitW = sHasSp ? CARD_W * 2 + COUPLE_GAP : CARD_W;
          let placeX = sibEdgeX - sUnitW;
          while (!canPlace(placeX, rowY, sUnitW, cardHeight)) {
            placeX -= SIBLING_GAP;
          }
          markCard(sibId, placeX, rowY);
          if (sHasSp) {
            markCard(sSpId, placeX + CARD_W + COUPLE_GAP, rowY);
          }
          sibEdgeX = placeX - SIBLING_GAP;

          // Place children of ancestor's siblings under them on the row below
          let sibKids = kidsOf(sibId);
          if (sibKids.length) {
            let sKidsRowY = rowY + cardHeight + ROW_GAP;
            let sKidsTotalW = sibKids.length * CARD_W + (sibKids.length - 1) * SIBLING_GAP;
            let sKidsStartX = placeX + sUnitW / 2 - sKidsTotalW / 2;
            while (!canPlace(sKidsStartX, sKidsRowY, sKidsTotalW, cardHeight)) {
              sKidsStartX -= SIBLING_GAP;
            }
            sibKids.forEach((skId, skIdx) => {
              if (byId[skId] && !pos[skId]) {
                markCard(skId, sKidsStartX + skIdx * (CARD_W + SIBLING_GAP), sKidsRowY);
              }
            });
          }
        }
      });
    });

    if (paternalChain.length) {
      let pTopStep = paternalChain[paternalChain.length - 1];
      let topCardPos = pos[pTopStep.id];
      if (topCardPos) {
        branchLabels.push({
          text: lang === 'hi' ? '↖ पितृ पक्ष (पिता का वंश)' : '↖ Paternal Ancestry (Father)',
          x: topCardPos.x,
          y: topCardPos.y - 22
        });
      }
    }

    // 4. Maternal / Spouse Chain (Upper-Right ↗)
    let matChainToUse = spouseChain.length ? spouseChain : maternalChain;
    let matOriginId = spousePerson ? spouseId : (fMomId && pos[fMomId] ? fMomId : fId);
    let matOriginPos = pos[matOriginId] || { x: spouseX, y: focalY };

    matChainToUse.forEach((step, idx) => {
      let level = idx + 1;
      let rowY = focalY - level * (cardHeight + ROW_GAP);
      let unitW = step.spouseId ? CARD_W * 2 + COUPLE_GAP : CARD_W;
      let targetX = matOriginPos.x + level * (CARD_W + 60);

      while (!canPlace(targetX, rowY, unitW, cardHeight)) {
        targetX += 20;
      }

      markCard(step.id, targetX, rowY);
      if (step.spouseId && byId[step.spouseId] && !pos[step.spouseId]) {
        markCard(step.spouseId, targetX + CARD_W + COUPLE_GAP, rowY);
      }

      // Spouse's ancestor siblings
      let sibEdgeX = targetX + unitW + SIBLING_GAP;
      (step.sibs || []).forEach(sibId => {
        if (byId[sibId] && !pos[sibId]) {
          let sSpId = spouse[sibId];
          let sHasSp = sSpId && byId[sSpId] && !pos[sSpId];
          let sUnitW = sHasSp ? CARD_W * 2 + COUPLE_GAP : CARD_W;
          while (!canPlace(sibEdgeX, rowY, sUnitW, cardHeight)) {
            sibEdgeX += SIBLING_GAP;
          }
          markCard(sibId, sibEdgeX, rowY);
          if (sHasSp) {
            markCard(sSpId, sibEdgeX + CARD_W + COUPLE_GAP, rowY);
          }
          sibEdgeX += sUnitW + SIBLING_GAP;
        }
      });

      // Also place other children of this ancestor (i.e. siblings of the married spouse)
      let ancKids = kidsOf(step.id);
      let otherAncKids = ancKids.filter(k => k !== step.childId && byId[k] && !pos[k]);
      if (otherAncKids.length) {
        let ancKidsRowY = rowY + cardHeight + ROW_GAP;
        let ancKidsTotalW = otherAncKids.length * CARD_W + (otherAncKids.length - 1) * SIBLING_GAP;
        let ancKidsStartX = targetX + unitW / 2 - ancKidsTotalW / 2;
        while (!canPlace(ancKidsStartX, ancKidsRowY, ancKidsTotalW, cardHeight)) {
          ancKidsStartX += SIBLING_GAP;
        }
        otherAncKids.forEach((akId, akIdx) => {
          if (byId[akId] && !pos[akId]) {
            markCard(akId, ancKidsStartX + akIdx * (CARD_W + SIBLING_GAP), ancKidsRowY);
          }
        });
      }
    });

    if (matChainToUse.length) {
      let topStep = matChainToUse[matChainToUse.length - 1];
      let topCardPos = pos[topStep.id];
      if (topCardPos) {
        let labelText = spouseChain.length
          ? (lang === 'hi' ? '↗ ससुराल पक्ष (जीवनसाथी का परिवार)' : "↗ Spouse's Family (In-laws)")
          : (lang === 'hi' ? '↗ मातृ पक्ष (माता का वंश)' : '↗ Maternal Ancestry (Mother)');
        branchLabels.push({
          text: labelText,
          x: topCardPos.x,
          y: topCardPos.y - 22
        });
      }
    }

    // 5. Focal Person's Children (Downward ↓)
    let focalKids = kidsOf(fId);
    let kidsRowY = focalY + cardHeight + ROW_GAP;
    if (focalKids.length) {
      let totalKidsW = focalKids.length * CARD_W + (focalKids.length - 1) * SIBLING_GAP;
      let kStartX = focalCx - totalKidsW / 2;

      while (!canPlace(kStartX, kidsRowY, totalKidsW, cardHeight)) {
        kStartX += 20;
      }

      focalKids.forEach((kId, idx) => {
        let kX = kStartX + idx * (CARD_W + SIBLING_GAP);
        markCard(kId, kX, kidsRowY);
      });

      branchLabels.push({
        text: lang === 'hi' ? '↓ संतान (संतान एवं वंशज)' : '↓ Children & Descendants',
        x: kStartX,
        y: kidsRowY - 22
      });
    }

    // 6. Focal Siblings' Children (Nephews & Nieces) placed under their respective parents!
    fSibs.forEach(sibId => {
      let sibKids = kidsOf(sibId);
      let sibPos = pos[sibId];
      if (sibKids.length && sibPos) {
        let sSpId = spouse[sibId];
        let sSpPos = sSpId ? pos[sSpId] : null;
        let sibCoupleCx = sSpPos ? (sibPos.x + sSpPos.x + CARD_W) / 2 : sibPos.x + CARD_W / 2;
        let skTotalW = sibKids.length * CARD_W + (sibKids.length - 1) * SIBLING_GAP;
        let skStartX = sibCoupleCx - skTotalW / 2;
        let skRowY = focalY + cardHeight + ROW_GAP;
        while (!canPlace(skStartX, skRowY, skTotalW, cardHeight)) {
          skStartX += SIBLING_GAP;
        }
        sibKids.forEach((skId, skIdx) => {
          if (byId[skId] && !pos[skId]) {
            markCard(skId, skStartX + skIdx * (CARD_W + SIBLING_GAP), skRowY);
          }
        });
      }
    });

    // Normalize coordinates if shifted
    let minAllX = Math.min(...placedRects.map(r => r.x));
    let minAllY = Math.min(...placedRects.map(r => r.y));
    let xOffset = minAllX < LEFT_PAD ? LEFT_PAD - minAllX : 0;
    let yOffset = minAllY < TOP_PAD ? TOP_PAD - minAllY : 0;

    if (xOffset > 0 || yOffset > 0) {
      for (let id of Object.keys(pos)) {
        pos[id].x += xOffset;
        pos[id].y += yOffset;
      }
      placedRects.forEach(r => {
        r.x += xOffset;
        r.y += yOffset;
      });
      branchLabels.forEach(b => {
        b.x += xOffset;
        b.y += yOffset;
      });
    }

    // =========================================================================
    // STRICTLY ORTHOGONAL MANHATTAN PATHS (NO BEZIER CURVES!)
    // =========================================================================
    let mainPath = "";
    let otherPath = "";
    let bridgePath = "";

    // 1. Couples (Strictly adjacent horizontal bar)
    couples.forEach(c => {
      if (c.h && c.w && pos[c.h] && pos[c.w]) {
        let p1 = pos[c.h], p2 = pos[c.w];
        if (p1.y === p2.y) {
          let leftP = p1.x < p2.x ? p1 : p2;
          let rightP = p1.x < p2.x ? p2 : p1;
          let gap = rightP.x - (leftP.x + CARD_W);
          if (gap >= 0 && gap <= COUPLE_GAP + 12) {
            let d = `M${leftP.x + CARD_W} ${leftP.y + 34}H${rightP.x} `;
            let isMaternalOrInLaw = matChainToUse.some(step => step.id === c.h || step.id === c.w || step.spouseId === c.h || step.spouseId === c.w);
            if (isMaternalOrInLaw) {
              otherPath += d;
            } else {
              mainPath += d;
            }
          }
        }
      }
    });

    // 2. Parent-to-Child Bus Connections for all placed families!
    // (a) Paternal Ancestors -> direct line child (Orthogonal step: M ... V midY H parentCx V parentBottomY)
    paternalChain.forEach(step => {
      let childPos = pos[step.childId];
      let parentPos = pos[step.id];
      if (!childPos || !parentPos) return;

      let spId = step.spouseId;
      let spPos = (spId && pos[spId]) ? pos[spId] : null;
      let parentCoupleCx = spPos ? (parentPos.x + spPos.x + CARD_W) / 2 : parentPos.x + CARD_W / 2;
      let parentBottomY = parentPos.y + cardHeight;

      let childTopX = childPos.x + 24; // Upper-left corner of child
      let childTopY = childPos.y;
      let midY = (childTopY + parentBottomY) / 2;

      // Clean orthogonal right-angle Manhattan line!
      mainPath += `M${childTopX} ${childTopY}V${midY}H${parentCoupleCx}V${parentBottomY} `;
    });

    // (b) Ancestor siblings' children (e.g. Prabud Dayal -> Navin, Munni, Hari Krishna, Sitaram)
    paternalChain.forEach(step => {
      (step.sibs || []).forEach(sibId => {
        let sKids = kidsOf(sibId).filter(k => pos[k]);
        let sPos = pos[sibId];
        if (sKids.length && sPos) {
          let spId = spouse[sibId];
          let spPos = spId && pos[spId] ? pos[spId] : null;
          let parentCoupleCx = spPos ? (sPos.x + spPos.x + CARD_W) / 2 : sPos.x + CARD_W / 2;
          let parentBottomY = sPos.y + cardHeight;
          let busY = parentBottomY + ROW_GAP / 2;

          let kidCxs = sKids.map(kId => pos[kId].x + CARD_W / 2);
          let kidTopY = pos[sKids[0]].y;

          mainPath += `M${parentCoupleCx} ${parentBottomY}V${busY} `;
          mainPath += `M${Math.min(...kidCxs, parentCoupleCx)} ${busY}H${Math.max(...kidCxs, parentCoupleCx)} `;
          kidCxs.forEach(cx => {
            mainPath += `M${cx} ${busY}V${kidTopY} `;
          });
        }
      });
    });

    // (c) Maternal / Spouse Chain -> direct line spouse / child (Orthogonal step)
    matChainToUse.forEach(step => {
      let childPos = pos[step.childId];
      let parentPos = pos[step.id];
      if (!childPos || !parentPos) return;

      let spId = step.spouseId;
      let spPos = (spId && pos[spId]) ? pos[spId] : null;
      let parentCoupleCx = spPos ? (parentPos.x + spPos.x + CARD_W) / 2 : parentPos.x + CARD_W / 2;
      let parentBottomY = parentPos.y + cardHeight;

      let childTopX = childPos.x + CARD_W - 24; // Upper-right corner of child
      let childTopY = childPos.y;
      let midY = (childTopY + parentBottomY) / 2;

      // Clean orthogonal right-angle Manhattan line!
      otherPath += `M${childTopX} ${childTopY}V${midY}H${parentCoupleCx}V${parentBottomY} `;

      // Also connect other children of this ancestor (e.g. Anant & Radha -> Sonal, Amit, Neha)
      let otherKids = kidsOf(step.id).filter(k => k !== step.childId && pos[k]);
      if (otherKids.length) {
        let busY = midY;
        let kidCxs = otherKids.map(kId => pos[kId].x + CARD_W / 2);
        let kidTopY = pos[otherKids[0]].y;

        otherPath += `M${parentCoupleCx} ${parentBottomY}V${busY} `;
        otherPath += `M${Math.min(...kidCxs, parentCoupleCx)} ${busY}H${Math.max(...kidCxs, parentCoupleCx)} `;
        kidCxs.forEach(cx => {
          otherPath += `M${cx} ${busY}V${kidTopY} `;
        });
      }
    });

    // (d) Focal Person & Spouse -> Children (Orthogonal bus)
    if (focalKids.length) {
      let kidCxs = focalKids.filter(k => pos[k]).map(kId => pos[kId].x + CARD_W / 2);
      if (kidCxs.length) {
        let fP = pos[fId];
        let parentCx = (spousePerson && pos[spouseId]) ? (fP.x + pos[spouseId].x + CARD_W) / 2 : fP.x + CARD_W / 2;
        let parentBottomY = fP.y + cardHeight;
        let busY = fP.y + cardHeight + ROW_GAP / 2;
        let kidTopY = pos[focalKids[0]].y;

        mainPath += `M${parentCx} ${parentBottomY}V${busY} `;
        mainPath += `M${Math.min(...kidCxs, parentCx)} ${busY}H${Math.max(...kidCxs, parentCx)} `;
        kidCxs.forEach(cx => {
          mainPath += `M${cx} ${busY}V${kidTopY} `;
        });
      }
    }

    // (e) Focal Siblings -> Children (Orthogonal bus)
    fSibs.forEach(sibId => {
      let sibKids = kidsOf(sibId).filter(k => pos[k]);
      let sibPos = pos[sibId];
      if (sibKids.length && sibPos) {
        let spId = spouse[sibId];
        let spPos = spId && pos[spId] ? pos[spId] : null;
        let parentCoupleCx = spPos ? (sibPos.x + spPos.x + CARD_W) / 2 : sibPos.x + CARD_W / 2;
        let parentBottomY = sibPos.y + cardHeight;
        let busY = parentBottomY + ROW_GAP / 2;

        let kidCxs = sibKids.map(kId => pos[kId].x + CARD_W / 2);
        let kidTopY = pos[sibKids[0]].y;

        mainPath += `M${parentCoupleCx} ${parentBottomY}V${busY} `;
        mainPath += `M${Math.min(...kidCxs, parentCoupleCx)} ${busY}H${Math.max(...kidCxs, parentCoupleCx)} `;
        kidCxs.forEach(cx => {
          mainPath += `M${cx} ${busY}V${kidTopY} `;
        });
      }
    });

    let finalMaxX = Math.max(...placedRects.map(r => r.x + r.w));
    let finalMaxY = Math.max(...placedRects.map(r => r.y + r.h));

    return {
      pos,
      W: Math.max(finalMaxX + 80, 800),
      H: Math.max(finalMaxY + 80, 600),
      path: mainPath + otherPath,
      mainPath,
      otherPath,
      bridgePath,
      guideLines: "",
      genLabels: [],
      branchLabels
    };
  }
};

export default computeTreeLayout;
