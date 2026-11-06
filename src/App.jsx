import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { loadInitialTreeState, saveTreeState } from './utils/storage.js';
import { buildFamilyIndex, INITIAL_DATA } from './data/familyData.js';
import { createTranslator } from './i18n/index.js';
import { computeTreeLayout } from './layout/engine.js';
import { dedup } from './utils/deduplication.js';
import { transliterateToHindi } from './i18n/translit.js';

import Navbar from './components/Navbar.jsx';
import LandingPage from './components/LandingPage.jsx';
import CreateTreeModal from './components/CreateTreeModal.jsx';
import AuthModal, {
  LOCAL_AUTH_KEY,
  loadLocalAuthUser,
  saveLocalAuthUser
} from './components/AuthModal.jsx';
import { subscribeToAuth, signOutUser, isFirebaseConfigured } from './services/firebase.js';
import {
  getTreeIdFromUrl,
  setTreeIdInUrl,
  subscribeToTree,
  createUserTree,
  saveUserTreeDebounced,
  canUserEditTree,
  isPhotosPayloadWithinLimit
} from './services/treeSync.js';
import Toolbar from './components/Toolbar.jsx';
import Canvas from './components/Canvas.jsx';
import Sheet from './components/Sheet.jsx';
import AddModal from './components/AddModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import Tabs from './components/Tabs.jsx';
import OnboardingToast from './components/OnboardingToast.jsx';

export function App() {
  const [treeState, setTreeState] = useState(loadInitialTreeState);

  // Settings & Accessibility
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("gupta_theme") || "system";
    } catch {
      return "system";
    }
  });

  const [textSize, setTextSize] = useState(() => {
    try {
      return localStorage.getItem("gupta_text_size") || "normal";
    } catch {
      return "normal";
    }
  });

  const [contrast, setContrast] = useState(() => {
    try {
      return localStorage.getItem("gupta_contrast") || "normal";
    } catch {
      return "normal";
    }
  });

  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem("gupta_motion") || "normal";
    } catch {
      return "normal";
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => (getTreeIdFromUrl() ? "tree" : "home"));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(() => (isFirebaseConfigured() ? null : loadLocalAuthUser()));
  const [activeTreeId, setActiveTreeId] = useState(() => getTreeIdFromUrl());
  const [activeTreeMeta, setActiveTreeMeta] = useState(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("rel");
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [showGuideBanner, setShowGuideBanner] = useState(() => {
    try {
      return !localStorage.getItem("gupta_hide_guide");
    } catch {
      return true;
    }
  });

  const [zoom, setZoom] = useState(1);
  const [cardHeight, setCardHeight] = useState(138);

  const previousActiveElement = useRef(null);
  const isLocalMutationRef = useRef(false);
  const activeTreeMetaRef = useRef(null);

  useEffect(() => {
    activeTreeMetaRef.current = activeTreeMeta;
  }, [activeTreeMeta]);

  // Subscribe to Firebase Auth state (single source of truth when Firebase is configured)
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const onStorage = e => {
        if (e.key === LOCAL_AUTH_KEY) {
          setUser(loadLocalAuthUser());
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
    return subscribeToAuth(fbUser => {
      setUser(fbUser);
      saveLocalAuthUser(fbUser);
    });
  }, []);

  // Subscribe to shared/custom tree when ?tree=<id> is active
  useEffect(() => {
    if (!activeTreeId) {
      setActiveTreeMeta(null);
      return;
    }
    return subscribeToTree(
      activeTreeId,
      docData => {
        setActiveTreeMeta(docData);
        if (docData?.data?.people) {
          isLocalMutationRef.current = false;
          setTreeState(prev => ({
            ...prev,
            data: docData.data,
            photos: docData.photos || {},
            lang: docData.lang || prev.lang,
            viewer: ""
          }));
        }
      },
      () => {
        setActiveTreeId("");
        setTreeIdInUrl("");
      }
    );
  }, [activeTreeId]);

  // Save tree state ONLY on local user mutations (prevents infinite Firestore snapshot/write loop)
  useEffect(() => {
    if (!isLocalMutationRef.current) return;
    isLocalMutationRef.current = false;

    if (!activeTreeId) {
      saveTreeState(treeState);
    } else if (user && canUserEditTree(activeTreeMetaRef.current, user)) {
      saveUserTreeDebounced(
        activeTreeId,
        {
          ...activeTreeMetaRef.current,
          data: treeState.data,
          photos: treeState.photos,
          lang: treeState.lang
        },
        user
      );
    }
  }, [treeState, activeTreeId, user]);

  // Sync theme attribute
  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("gupta_theme", "dark");
      } else if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("gupta_theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("gupta_theme", "system");
      }
    } catch {}
  }, [theme]);

  // Sync text size attribute
  useEffect(() => {
    try {
      if (textSize === "large") {
        document.documentElement.setAttribute("data-text-size", "large");
      } else if (textSize === "xlarge") {
        document.documentElement.setAttribute("data-text-size", "xlarge");
      } else {
        document.documentElement.removeAttribute("data-text-size");
      }
      localStorage.setItem("gupta_text_size", textSize);
    } catch {}
  }, [textSize]);

  // Sync contrast attribute
  useEffect(() => {
    try {
      if (contrast === "high") {
        document.documentElement.setAttribute("data-contrast", "high");
      } else {
        document.documentElement.removeAttribute("data-contrast");
      }
      localStorage.setItem("gupta_contrast", contrast);
    } catch {}
  }, [contrast]);

  // Sync motion attribute
  useEffect(() => {
    try {
      if (motion === "reduce") {
        document.documentElement.setAttribute("data-motion", "reduce");
      } else {
        document.documentElement.removeAttribute("data-motion");
      }
      localStorage.setItem("gupta_motion", motion);
    } catch {}
  }, [motion]);

  // Sync document language
  useEffect(() => {
    document.documentElement.lang = treeState.lang;
  }, [treeState.lang]);

  // Dismiss guide banner persistence
  const handleDismissGuide = () => {
    setShowGuideBanner(false);
    try {
      localStorage.setItem("gupta_hide_guide", "1");
    } catch {}
  };

  // Keyboard shortcuts (/ for search, ? for help)
  useEffect(() => {
    const handleGlobalKey = e => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      } else if (e.key === "?") {
        e.preventDefault();
        setIsHelpModalOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Family Index & Translator
  const familyIndex = useMemo(() => buildFamilyIndex(treeState.data), [treeState.data]);
  const t = useMemo(() => createTranslator(treeState.lang), [treeState.lang]);

  const displayName = id => {
    const p = familyIndex.byId[id];
    if (!p) return "";
    return treeState.lang === "hi" && p.hi ? p.hi : p.name;
  };

  // Sync cardHeight dynamically with textSize so cards and orthogonal connectors never overlap
  useEffect(() => {
    setCardHeight(textSize === "xlarge" ? 168 : textSize === "large" ? 152 : 138);
  }, [textSize]);

  // Spatial Layout Calculation
  const layout = useMemo(() => {
    return computeTreeLayout(
      treeState.data,
      cardHeight,
      treeState.lang,
      treeState.viewer
    );
  }, [treeState.data, cardHeight, treeState.lang, treeState.viewer]);

  // Auto-fit initial view
  const fitView = () => {
    const el = document.querySelector(".treewrap");
    if (!el || !layout.W) return;
    const nextZoom = Math.max(0.6, Math.min(1, (el.clientWidth - 2) / layout.W));
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const midX = (layout.mainMidX != null ? layout.mainMidX : layout.W / 2) * nextZoom;
      el.scrollLeft = Math.max(0, midX - el.clientWidth / 2);
    });
  };

  useEffect(() => {
    if (currentView !== "tree") return;
    const id = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeState.viewer, currentView]);

  const changeZoom = delta =>
    setZoom(z => Math.max(0.4, Math.min(1.4, +(z + delta).toFixed(2))));

  // Landing page statistics
  const generationCount = useMemo(() => {
    const memo = {};
    const depth = id => {
      if (memo[id] !== undefined) return memo[id];
      memo[id] = 1;
      const pars = familyIndex.parOf(id);
      memo[id] = 1 + (pars.length ? Math.max(...pars.map(depth)) : 0);
      return memo[id];
    };
    return treeState.data.people.reduce((m, p) => Math.max(m, depth(p.id)), 0);
  }, [familyIndex, treeState.data.people]);

  // Search Filtering
  const cleanQuery = searchQuery.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!cleanQuery) return [];
    return treeState.data.people.filter(p =>
      `${p.name} ${p.hi || ""}`.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery, treeState.data.people]);

  // Modal open / close handlers
  const openPersonDetails = id => {
    if (!selectedPersonId) {
      previousActiveElement.current = document.activeElement;
    }
    setSelectedPersonId(id);
  };

  const closePersonDetails = () => {
    setSelectedPersonId(null);
    previousActiveElement.current?.focus?.();
  };

  const isOwner = Boolean(
    user && (!activeTreeId || canUserEditTree(activeTreeMeta, user))
  );
  // Guests can freely explore/edit their local browser copy of the canonical Gupta tree (!activeTreeId),
  // whereas shared trees (?tree=<id>) are strictly editable only by their owner or collaborators.
  const canEdit = !activeTreeId || canUserEditTree(activeTreeMeta, user);

  // Person mutation actions
  const handlePatchPerson = (id, patch) => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    setTreeState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        people: prev.data.people.map(p => (p.id === id ? { ...p, ...patch } : p))
      }
    }));
  };

  const handleAddMember = ({ rel, target, person }) => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    const newId = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newPerson = { id: newId, ...person };

    setTreeState(prev => {
      const idx = buildFamilyIndex(prev.data);
      let couples = prev.data.couples.map(c => ({ ...c, kids: [...c.kids] }));

      if (rel === "spouse") {
        const existingCouple = couples.find(
          c => (c.h === target && !c.w) || (c.w === target && !c.h)
        );
        if (existingCouple) {
          if (existingCouple.h === target) existingCouple.w = newId;
          else existingCouple.h = newId;
        } else {
          const targetPerson = idx.byId[target];
          couples.push(
            (targetPerson?.g || "M") === "F" && person.g === "M"
              ? { h: newId, w: target, kids: [] }
              : { h: target, w: newId, kids: [] }
          );
        }
      } else if (rel === "child") {
        let placed = false;
        couples = couples.map(c => {
          if (c.h === target || c.w === target) {
            placed = true;
            return { ...c, kids: Array.from(new Set([...c.kids, newId])) };
          }
          return c;
        });
        if (!placed) {
          couples.push({ h: target, w: "", kids: [newId] });
        }
      } else if (rel === "parent") {
        const existingCouple = couples.find(c => c.kids.includes(target));
        if (existingCouple) {
          if (person.g === "M" && !existingCouple.h) existingCouple.h = newId;
          else if (person.g === "F" && !existingCouple.w) existingCouple.w = newId;
          else {
            couples.push(
              person.g === "F"
                ? { h: "", w: newId, kids: [target] }
                : { h: newId, w: "", kids: [target] }
            );
          }
        } else {
          couples.push(
            person.g === "F"
              ? { h: "", w: newId, kids: [target] }
              : { h: newId, w: "", kids: [target] }
          );
        }
      } else if (rel === "sibling") {
        let placed = false;
        couples = couples.map(c => {
          const kidIdx = c.kids.indexOf(target);
          if (kidIdx < 0) return c;
          placed = true;
          const updatedKids = [...c.kids];
          updatedKids.splice(kidIdx + 1, 0, newId);
          return { ...c, kids: Array.from(new Set(updatedKids)) };
        });
        if (!placed) {
          couples.push({ h: "", w: "", kids: [target, newId] });
        }
      }

      // Consolidate lone partner couples
      const cleaned = [];
      for (const c of couples) {
        if ((!c.h || !c.w) && (c.h || c.w)) {
          const p = c.h || c.w;
          const full = couples.find(o => (o.h === p && o.w) || (o.w === p && o.h));
          if (full) {
            full.kids = Array.from(new Set([...full.kids, ...c.kids]));
            continue;
          }
        }
        cleaned.push(c);
      }

      return {
        ...prev,
        data: {
          people: [...prev.data.people, newPerson],
          couples: cleaned
        }
      };
    });

    openPersonDetails(newId);
  };

  const handleRemovePerson = id => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    setTreeState(prev => {
      const remainingPeople = prev.data.people.filter(p => p.id !== id);
      const remainingCouples = prev.data.couples
        .filter(c => c.h !== id && c.w !== id)
        .map(c => ({
          ...c,
          kids: c.kids.filter(k => k !== id)
        }));
      const remainingPhotos = { ...prev.photos };
      delete remainingPhotos[id];

      return {
        ...prev,
        data: {
          people: remainingPeople,
          couples: remainingCouples
        },
        photos: remainingPhotos,
        viewer: prev.viewer === id ? "" : prev.viewer
      };
    });
    closePersonDetails();
  };

  const handleSetPhoto = (id, dataUrl) => {
    if (!canEdit) return false;
    const updatedPhotos = { ...treeState.photos };
    if (dataUrl) {
      updatedPhotos[id] = dataUrl;
    } else {
      delete updatedPhotos[id];
    }
    if (Object.keys(updatedPhotos).length > 100 || !isPhotosPayloadWithinLimit(updatedPhotos)) {
      return false;
    }
    isLocalMutationRef.current = true;
    setTreeState(prev => ({ ...prev, photos: updatedPhotos }));
    return true;
  };

  const handleImport = (newData, newPhotos) => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    setTreeState(prev =>
      dedup({
        ...prev,
        data: newData,
        photos: newPhotos ?? prev.photos,
        viewer: ""
      })
    );
  };

  const handleReset = () => {
    isLocalMutationRef.current = true;
    setTreeState(prev => ({
      ...prev,
      data: JSON.parse(JSON.stringify(INITIAL_DATA)),
      viewer: ""
    }));
  };

  const enterTree = () => {
    setCurrentView("tree");
    window.scrollTo({ top: 0 });
  };

  const handleSelectTree = (treeId, treeDoc) => {
    isLocalMutationRef.current = false;
    if (!treeId) {
      setActiveTreeId("");
      setActiveTreeMeta(null);
      setTreeIdInUrl("");
      setTreeState(loadInitialTreeState());
    } else {
      setActiveTreeId(treeId);
      setTreeIdInUrl(treeId);
      if (treeDoc?.data) {
        setActiveTreeMeta(treeDoc);
        setTreeState(prev => ({
          ...prev,
          data: treeDoc.data,
          photos: treeDoc.photos || {},
          viewer: ""
        }));
      }
    }
    enterTree();
  };

  const handleCreateBlank = async ({ title, rootName, isPublic }) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const hi = await transliterateToHindi(rootName);
    const newData = {
      people: [{ id: "p" + Date.now().toString(36), name: rootName, hi, g: "M" }],
      couples: []
    };
    const created = await createUserTree(
      { title, data: newData, photos: {}, isPublic, lang: treeState.lang },
      user
    );
    isLocalMutationRef.current = false;
    setActiveTreeId(created.id);
    setActiveTreeMeta(created);
    setTreeIdInUrl(created.id);
    setTreeState(prev => ({
      ...prev,
      data: newData,
      photos: {},
      viewer: ""
    }));
    setIsCreateOpen(false);
    enterTree();
  };

  const handleCreateImport = async ({ title, data: newData, photos: newPhotos, isPublic }) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const deduped = dedup({
      data: newData,
      photos: newPhotos || {},
      lang: treeState.lang,
      viewer: ""
    });
    const created = await createUserTree(
      {
        title,
        data: deduped.data,
        photos: deduped.photos,
        isPublic,
        lang: treeState.lang
      },
      user
    );
    isLocalMutationRef.current = false;
    setActiveTreeId(created.id);
    setActiveTreeMeta(created);
    setTreeIdInUrl(created.id);
    setTreeState(prev => ({
      ...prev,
      data: deduped.data,
      photos: deduped.photos,
      viewer: ""
    }));
    setIsCreateOpen(false);
    enterTree();
  };

  const handleCreateRestore = () => {
    setActiveTreeId("");
    setActiveTreeMeta(null);
    setTreeIdInUrl("");
    handleReset();
    setIsCreateOpen(false);
    enterTree();
  };

  const handleSignOut = async () => {
    await signOutUser();
    saveLocalAuthUser(null);
    setUser(null);
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        {treeState.lang === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to main content"}
      </a>
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        memberCount={treeState.data.people.length}
        generationCount={generationCount}
        activeTreeId={activeTreeId}
        activeTreeTitle={activeTreeMeta?.title || ""}
        isOwner={isOwner}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenTreesModal={() => setIsCreateOpen(true)}
        t={t}
        lang={treeState.lang}
        setLang={l => {
          isLocalMutationRef.current = true;
          setTreeState(prev => ({ ...prev, lang: l }));
        }}
        theme={theme}
        setTheme={setTheme}
        textSize={textSize}
        setTextSize={setTextSize}
        contrast={contrast}
        setContrast={setContrast}
        motion={motion}
        setMotion={setMotion}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />

      {currentView === "home" ? (
        <main id="main-content">
          <LandingPage
            t={t}
            memberCount={treeState.data.people.length}
            generationCount={generationCount}
            branchCount={treeState.data.couples.length}
            onExplore={enterTree}
            onCreate={() => setIsCreateOpen(true)}
          />
        </main>
      ) : (
    <main id="main-content" className="page">
      {/* Header */}
      <header className="reveal-parent" tabIndex={0}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{activeTreeMeta?.title || t("h1")}</h1>
        <p className="lede hover-explanation">
          {t("lede")}{" "}
          <span className="count">{t("people", treeState.data.people.length)}</span>
        </p>
      </header>

      {/* Toolbar & Controls */}
      <Toolbar
        viewer={treeState.viewer}
        setViewer={vId => setTreeState(prev => ({ ...prev, viewer: vId }))}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        people={treeState.data.people}
        displayName={displayName}
        t={t}
        lang={treeState.lang}
        onOpenAddModal={() => canEdit && setIsAddModalOpen(true)}
        canEdit={canEdit}
        familyIndex={familyIndex}
      />

      {/* Interactive Canvas */}
      <Canvas
        treeState={treeState}
        familyIndex={familyIndex}
        layout={layout}
        cardHeight={cardHeight}
        zoom={zoom}
        setZoom={setZoom}
        fitView={fitView}
        searchQuery={searchQuery}
        searchMatches={searchMatches}
        viewer={treeState.viewer}
        lang={treeState.lang}
        t={t}
        displayName={displayName}
        onCardClick={openPersonDetails}
        onZoom={changeZoom}
        onResetViewer={() => setTreeState(prev => ({ ...prev, viewer: "" }))}
      />

      {/* Tools & Details Tabs */}
      <Tabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        treeState={treeState}
        familyIndex={familyIndex}
        lang={treeState.lang}
        t={t}
        displayName={displayName}
        openPerson={openPersonDetails}
        onImport={handleImport}
        onReset={handleReset}
        canEdit={canEdit}
      />

      {/* Footer */}
      <p className="foot">{t("foot")}</p>

      {/* Person Detail Slide-Out / Modal */}
      {selectedPersonId && familyIndex.byId[selectedPersonId] && (
        <Sheet
          id={selectedPersonId}
          familyIndex={familyIndex}
          t={t}
          lang={treeState.lang}
          displayName={displayName}
          viewer={treeState.viewer}
          photo={treeState.photos[selectedPersonId]}
          setViewer={vId => setTreeState(prev => ({ ...prev, viewer: vId }))}
          close={closePersonDetails}
          open={openPersonDetails}
          patch={handlePatchPerson}
          add={(targetId, rel, name, hi, g) =>
            handleAddMember({ rel, target: targetId, person: { name, hi, g } })
          }
          remove={handleRemovePerson}
          setPhoto={handleSetPhoto}
          canEdit={canEdit}
        />
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && canEdit && (
        <AddModal
          familyIndex={familyIndex}
          t={t}
          lang={treeState.lang}
          displayName={displayName}
          people={treeState.data.people}
          couples={treeState.data.couples}
          close={() => setIsAddModalOpen(false)}
          onAdd={handleAddMember}
        />
      )}

      {/* Help & Keyboard Shortcuts Modal */}
      {isHelpModalOpen && (
        <HelpModal
          lang={treeState.lang}
          close={() => setIsHelpModalOpen(false)}
        />
      )}
    </main>
      )}

      {isCreateOpen && !isAuthOpen && (
        <CreateTreeModal
          t={t}
          user={user}
          activeTreeId={activeTreeId}
          close={() => setIsCreateOpen(false)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSelectTree={handleSelectTree}
          onCreateBlank={handleCreateBlank}
          onImport={handleCreateImport}
          onRestore={handleCreateRestore}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          t={t}
          close={() => setIsAuthOpen(false)}
          onSignedIn={u => setUser(u)}
        />
      )}

      <OnboardingToast
        currentView={currentView}
        activeTab={activeTab}
        lang={treeState.lang}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
      />
    </>
  );
}

export default App;
