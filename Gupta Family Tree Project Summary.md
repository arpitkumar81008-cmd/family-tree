# Gupta Family Tree: Project Summary

Nov 5, 2026 · @Arpit Kumar Gupta

Handoff notes for the next model.

## Who and what

The user is **Arpit** (Arpit Kumar Gupta, Hari Om and Minal's eldest son). He wanted a visual family tree website that can later be upgraded into a deployed web app, with the option to add pictures later. Claude asked relationship questions first, then built it.

## Family data (user-confirmed)

- **Gen 1:** Ram Dayal Gupta and (Late) Shri Mani Gupta, husband and wife. Four sons, in this order: Hari Om, Hari Narayan, Ashutosh, Akhilesh.
- **Gen 2 wives:** Minal (Hari Om's), Parul (Hari Narayan's), Sneha (Ashutosh's), Priya (Akhilesh's).
- **Gen 3:**
  - Hari Om and Minal: Arpit Kumar, Abhinav Kumar, Anurag Kumar.
  - Hari Narayan and Parul: Akshay and Akshara.
  - Ashutosh and Sneha: Rishabh and Anika.
  - Akhilesh and Priya: Nayra.

**Assumptions Claude made, not yet confirmed by the user:**

- Birth order follows the listed order. This drives the elder/younger kinship labels such as Tauji versus Chacha.
- Name spellings follow the first list (Ashutosh, Minal, Nayra).
- All Hindi spellings of names are Claude's own and unverified.

## Requests so far, in order

1. Build the family tree site, ask questions first, and allow photos later.
2. Refactor to a minimalist, no-AI-slop style: no decorative fluff, distinct fonts, one dominant background colour, one sharp accent, no buzzwords in the copy.
3. Make the page adjust to its text so nothing overflows or overlaps.
4. Add a language option.
5. Keep all wording respectful and parliamentary in every language.
6. The page appeared blank after the language change. Claude had introduced a script error and fixed it.
7. Invoke the web-artifacts-builder skill with "improve the webpage with more functionality".

## Current state

**Published artifact:** https://claude.ai/artifact/5jCLdM8RuBb6qoh24tJBaM (private; the user shares it from the page's Share menu). It is on Version 6, the React rebuild.

**Design**

- Bone-white ground, near-black ink, one red accent, with a dark theme.
- Bodoni Moda for the title and names, Familjen Grotesk for body text, Hind and Tiro Devanagari for Hindi.
- Square corners.

**Features**

- Interactive tree. Cards size to their text and the layout re-flows around them.
- Pan and zoom.
- English and Hindi switch, covering names, all text and the kinship terms. Hindi terms carry "जी" honorifics.
- "See relations from" dropdown, which labels everyone from one person's view with kinship terms (Chacha, Tai, Bhabhi and so on).
- Photo upload per person, cropped square and saved in the browser.
- Search that highlights matching cards.
- Edit name, Hindi name, date of birth, note and "passed away".
- Add a spouse, child or sibling. Remove a person who has no children.
- "How are we related?" finder showing the relation both ways plus the closest shared ancestor.
- Upcoming birthdays.
- Backup: copy the whole tree as JSON (photos optional) and restore it by pasting it back, plus a reset to the original tree.

**Storage:** everything lives in browser localStorage under the key `gupta-family-tree-v2`. Data from the older `gupta-family-tree-v1` key migrates automatically. It is per browser and per device, with no server.

## Files

- **Published source (fragment):** `/tmp/claude-0/-home-claude/7a7afb6e-ceba-571f-9bb7-0ccb314216b3/scratchpad/gupta-family-tree-react.html`. Republish with the Artifact tool, passing the artifact URL above.
- **React project:** `/tmp/claude-0/build/gupta-tree/`
  - `src/App.tsx` is the UI.
  - `src/family.ts` holds the data, the kinship engine, the Hindi term tables and the layout.
  - `src/i18n.ts` holds the English and Hindi strings.
  - `src/index.css` holds the styles.
- **Older single-file version:** `scratchpad/gupta-family-tree.html`, now superseded.
- **Test script:** `/tmp/claude-0/build/t.py` (Playwright, headless Chromium).

**Rebuild steps**

1. Remove the Google Fonts link from `index.html` before bundling, because html-inline crashes on external links. The original is kept in `index.full.html`.
2. Run `bash <skill dir>/web-artifacts-builder/scripts/bundle-artifact.sh`.
3. Convert `bundle.html` into a fragment: a title, the `claude:viewport-fit-sides` meta tag, the fonts link, the style block, `<div id="root">`, then the scripts. Publish that.

## Verification done

- Last browser test: all 18 cards present, no overflow and no console errors at 1280px and 400px wide.
- Features exercised: finder, add person, edit date of birth, birthdays, persistence across reload, Hindi switch, backup restore.
- Not tested: photo upload through a real file picker, and the live published page with the real Google Fonts. The test environment had no network access to fonts and used fallback fonts.

## Possible next steps

- Ask Arpit to confirm the birth order and the Hindi name spellings.
- Add dates of birth for family members.
- Move from a browser-only app to a deployed app. A Vercel connector is now available. It would need a shared database so the whole family can edit, and photos would move to storage.
- Memory: `/areas/family-tree.md` holds the family data. `/profile.md` is still unwritten, and "Arpit" could be filed there.
