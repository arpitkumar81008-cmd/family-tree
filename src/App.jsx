import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import {
  loadInitialTreeState,
  saveTreeState,
  mergeCloudTreeWithLocalHistory,
  recordDeletedId,
  clearDeletedIds,
  getStoredLanguage,
  setStoredLanguage,
  loadSavedCanvasZoom,
  saveCanvasZoom,
  loadSavedCanvasPan,
  saveCanvasPan,
  clampCanvasZoom,
  getLastPrivateTreeId,
  setLastPrivateTreeId
} from './utils/storage.js';
import { buildFamilyIndex, INITIAL_DATA } from './data/familyData.js';
import { createTranslator } from './i18n/index.js';
import { computeTreeLayout } from './layout/engine.js';
import { dedup } from './utils/deduplication.js';
import { transliterateToHindi } from './i18n/translit.js';

import Navbar from './components/Navbar.jsx';
import LandingPage from './components/LandingPage.jsx';
import Breadcrumbs from './components/Breadcrumbs.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import {
  LOCAL_AUTH_KEY,
  loadLocalAuthUser,
  saveLocalAuthUser
} from './components/AuthModal.jsx';
import { subscribeToAuth, signOutUser, isFirebaseConfigured } from './services/firebase.js';
import {
  getTreeIdFromUrl,
  setTreeIdInUrl,
  parseViewStateFromUrl,
  syncUrlWithViewState,
  subscribeToTree,
  listAvailableTrees,
  createUserTree,
  saveUserTree,
  canUserEditTree,
  isPhotosPayloadWithinLimit,
  findTreeByShareCode,
  recordUnlockedShareCode,
  generatePrivateShareToken,
  updateTreeSharingSettings,
  buildPrivateShareUrl,
  getApproveRequesterFromUrl,
  getShareCodeFromUrl,
  submitJoinRequest,
  getMyJoinRequest
} from './services/treeSync.js';
import { sendOwnerJoinRequestEmail } from './services/joinNotifications.js';
import Toolbar from './components/Toolbar.jsx';
import HelpModal from './components/HelpModal.jsx';
import Tabs from './components/Tabs.jsx';
import OnboardingToast from './components/OnboardingToast.jsx';

const Canvas = lazy(() => import('./components/Canvas.jsx'));
const Sheet = lazy(() => import('./components/Sheet.jsx'));
const AddModal = lazy(() => import('./components/AddModal.jsx'));
const RelationSolverModal = lazy(() => import('./components/RelationSolverModal.jsx'));
const CreateTreeModal = lazy(() => import('./components/CreateTreeModal.jsx'));
const ShareTreeModal = lazy(() => import('./components/ShareTreeModal.jsx'));
const AuthModal = lazy(() => import('./components/AuthModal.jsx'));

export function App() {
  const [treeState, setTreeState] = useState(() => {
    const initial = loadInitialTreeState();
    const storedLang = getStoredLanguage("en");
    return {
      ...initial,
      lang: storedLang || initial.lang || "en"
    };
  });

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

  const [viewportMode, setViewportMode] = useState(() => {
    try {
      return localStorage.getItem("gupta_viewport_mode") || "auto";
    } catch {
      return "auto";
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => parseViewStateFromUrl().view);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(() => (isFirebaseConfigured() ? null : loadLocalAuthUser()));
  const [activeTreeId, setActiveTreeId] = useState(() => parseViewStateFromUrl().treeId);
  const [activeTreeMeta, setActiveTreeMeta] = useState(null);
  const [userPrivateTreeId, setUserPrivateTreeId] = useState(() => getLastPrivateTreeId() || "");
  const [treeAccessDenied, setTreeAccessDenied] = useState(false);
  const [loadingTree, setLoadingTree] = useState(() => Boolean(parseViewStateFromUrl().treeId));
  const [treeLoadError, setTreeLoadError] = useState(false);
  const [treeRetryCount, setTreeRetryCount] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [lockedCodeInput, setLockedCodeInput] = useState("");
  const [lockedCodeError, setLockedCodeError] = useState("");
  const [approveRequesterUid, setApproveRequesterUid] = useState(() => getApproveRequesterFromUrl());
  const [myJoinRequest, setMyJoinRequest] = useState(null);
  const [requestRole, setRequestRole] = useState("viewer");
  const [requestNote, setRequestNote] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState("");
  const [requestNotifyLinks, setRequestNotifyLinks] = useState(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("rel");
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isRelationSolverOpen, setIsRelationSolverOpen] = useState(false);
  const [collapsedSubTrees, setCollapsedSubTrees] = useState({});
  const [showGuideBanner, setShowGuideBanner] = useState(() => {
    try {
      return !localStorage.getItem("gupta_hide_guide");
    } catch {
      return true;
    }
  });

  const [zoom, setZoom] = useState(() => loadSavedCanvasZoom(1));
  const [cardHeight, setCardHeight] = useState(138);

  const previousActiveElement = useRef(null);
  const isLocalMutationRef = useRef(false);
  const activeTreeMetaRef = useRef(null);
  const autoLoadedUidRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);

  useEffect(() => {
    activeTreeMetaRef.current = activeTreeMeta;
  }, [activeTreeMeta]);

  // Synchronize state with browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const { view, treeId } = parseViewStateFromUrl();
      setCurrentView(view);
      setActiveTreeId(treeId);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Synchronize URL with active view and tree state
  useEffect(() => {
    syncUrlWithViewState(currentView, activeTreeId);
  }, [currentView, activeTreeId]);

  // Preserve last active private tree ID across view switches
  useEffect(() => {
    if (activeTreeId && activeTreeId.trim() !== "") {
      setLastPrivateTreeId(activeTreeId.trim());
    }
  }, [activeTreeId]);

  // Persist canvas zoom level
  useEffect(() => {
    saveCanvasZoom(zoom);
  }, [zoom]);

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

  const hasPrivateTree = Boolean(
    (activeTreeId && activeTreeId !== "tree_demo_sharma") || userPrivateTreeId
  );

  // Reset collapsed sub-trees when switching trees
  useEffect(() => {
    setCollapsedSubTrees({});
  }, [activeTreeId]);

  // Guard ?view=demo when user already has a private tree
  useEffect(() => {
    if (hasPrivateTree && currentView === "demo") {
      handleNavigateMyTree();
    }
  }, [hasPrivateTree, currentView]);

  // Automatically load the signed-in user's private or shared family tree ONCE on sign-in
  useEffect(() => {
    if (!user?.uid) {
      autoLoadedUidRef.current = null;
      return;
    }
    if (autoLoadedUidRef.current === user.uid) return;
    autoLoadedUidRef.current = user.uid;

    let cancelled = false;
    listAvailableTrees(user)
      .then(trees => {
        if (cancelled) return;
        const emailLower = user.email ? String(user.email).trim().toLowerCase() : "";
        const privateOwnedOrShared =
          trees.find(tr => tr.ownerUid === user.uid && tr.isPublic === false) ||
          trees.find(tr => tr.ownerUid === user.uid && tr.id !== "tree_demo_sharma") ||
          trees.find(
            tr =>
              tr.id !== "tree_demo_sharma" &&
              (canUserEditTree(tr, user) ||
                (emailLower &&
                  Array.isArray(tr.viewerEmails) &&
                  tr.viewerEmails.some(e => String(e).trim().toLowerCase() === emailLower)))
          );
        if (privateOwnedOrShared) {
          setUserPrivateTreeId(privateOwnedOrShared.id);
          setLastPrivateTreeId(privateOwnedOrShared.id);
          if (currentView !== "home" && !activeTreeId) {
            isLocalMutationRef.current = false;
            setTreeAccessDenied(false);
            setActiveTreeId(privateOwnedOrShared.id);
            setActiveTreeMeta(privateOwnedOrShared);
            setTreeIdInUrl(privateOwnedOrShared.id);
            if (privateOwnedOrShared.data?.people) {
              const merged = mergeCloudTreeWithLocalHistory(
                privateOwnedOrShared.id,
                privateOwnedOrShared.data,
                privateOwnedOrShared.photos || {},
                privateOwnedOrShared.lang
              );
              setTreeState(prev => ({
                ...prev,
                data: merged.data,
                photos: merged.photos,
                lang: getStoredLanguage(merged.lang || prev.lang),
                viewer: ""
              }));
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, activeTreeId, currentView]);

  // Subscribe to shared/custom tree when ?tree=<id> is active
  useEffect(() => {
    if (!activeTreeId) {
      setActiveTreeMeta(null);
      setTreeAccessDenied(false);
      setLoadingTree(false);
      setTreeLoadError(false);
      return;
    }
    if (!activeTreeMetaRef.current || activeTreeMetaRef.current.id !== activeTreeId) {
      setLoadingTree(true);
    }
    setTreeLoadError(false);
    setTreeAccessDenied(false);
    return subscribeToTree(
      activeTreeId,
      docData => {
        setLoadingTree(false);
        setTreeLoadError(false);
        setTreeAccessDenied(false);
        setActiveTreeMeta(docData);
        if (docData?.data?.people) {
          const merged = mergeCloudTreeWithLocalHistory(
            activeTreeId,
            docData.data,
            docData.photos || {},
            docData.lang
          );
          // Cloud snapshot is the source of truth for signed-in / shared trees
          isLocalMutationRef.current = false;
          setTreeState(prev => ({
            ...prev,
            data: merged.data,
            photos: merged.photos,
            lang: getStoredLanguage(merged.lang || prev.lang),
            viewer: ""
          }));
        }
      },
      err => {
        setLoadingTree(false);
        if (err?.code === "ACCESS_DENIED") {
          setActiveTreeMeta(null);
          setTreeAccessDenied(true);
          setTreeLoadError(false);
          return;
        }
        setActiveTreeMeta(null);
        setTreeAccessDenied(false);
        setTreeLoadError(true);
      },
      { user }
    );
  }, [activeTreeId, user, treeRetryCount]);

  const executeCloudSave = useCallback(async (targetTreeId, payload, targetUser) => {
    try {
      const ok = await saveUserTree(targetTreeId, payload, targetUser);
      setSaveError(!ok);
      return ok;
    } catch {
      setSaveError(true);
      return false;
    }
  }, []);

  const handleRetrySave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    if (!activeTreeId) {
      try {
        const ok = saveTreeState(treeState);
        setSaveError(!ok);
      } catch {
        setSaveError(true);
      }
      return;
    }
    if (user && canUserEditTree(activeTreeMetaRef.current, user)) {
      await executeCloudSave(
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
  };

  // Save tree state ONLY on local user mutations (prevents infinite Firestore snapshot/write loop)
  useEffect(() => {
    if (!isLocalMutationRef.current) return;
    isLocalMutationRef.current = false;

    if (!activeTreeId) {
      try {
        const ok = saveTreeState(treeState);
        setSaveError(!ok);
      } catch {
        setSaveError(true);
      }
    } else if (user && canUserEditTree(activeTreeMetaRef.current, user)) {
      const payload = {
        ...activeTreeMetaRef.current,
        data: treeState.data,
        photos: treeState.photos,
        lang: treeState.lang
      };
      pendingSaveRef.current = { treeId: activeTreeId, payload, user };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        saveTimerRef.current = null;
        if (pending) {
          executeCloudSave(pending.treeId, pending.payload, pending.user);
        }
      }, 600);
    }
  }, [treeState, activeTreeId, user, executeCloudSave]);

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

  // Sync viewport display mode attribute (laptop vs mobile)
  useEffect(() => {
    try {
      if (viewportMode === "laptop" || viewportMode === "mobile") {
        document.documentElement.setAttribute("data-viewport", viewportMode);
      } else {
        document.documentElement.removeAttribute("data-viewport");
      }
      localStorage.setItem("gupta_viewport_mode", viewportMode);
    } catch {}
  }, [viewportMode]);

  // Sync document language and persist globally
  useEffect(() => {
    document.documentElement.lang = treeState.lang;
    setStoredLanguage(treeState.lang);
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

  const layoutStructureKey = useMemo(() => {
    const people = treeState.data?.people || [];
    const couples = treeState.data?.couples || [];
    return (
      people.map(p => p.id + ":" + (p.g ?? "")).join("|") +
      "::" +
      couples.map(c => c.id + ":" + c.h + ":" + c.w + ":" + (c.kids || []).join(",")).join("|")
    );
  }, [treeState.data]);

  // Spatial Layout Calculation (memoized on structural key so note/DOB edits don't recompute layout)
  const layout = useMemo(() => {
    return computeTreeLayout(
      treeState.data,
      cardHeight,
      treeState.lang,
      treeState.viewer
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutStructureKey, cardHeight, treeState.lang, treeState.viewer]);

  const prevViewRef = useRef(currentView);

  // Auto-fit initial view
  const fitView = () => {
    const el = document.querySelector(".treewrap");
    if (!el || !layout.W) return;
    const nextZoom = Math.max(0.6, Math.min(1, (el.clientWidth - 2) / layout.W));
    setZoom(nextZoom);
    saveCanvasZoom(nextZoom);
    requestAnimationFrame(() => {
      const midX = (layout.mainMidX != null ? layout.mainMidX : layout.W / 2) * nextZoom;
      const left = Math.max(0, midX - el.clientWidth / 2);
      el.scrollLeft = left;
      el.scrollTop = 0;
      saveCanvasPan({ scrollLeft: left, scrollTop: 0 });
    });
  };

  useEffect(() => {
    if (currentView !== "tree") {
      prevViewRef.current = currentView;
      return;
    }

    const isReturningFromHome = prevViewRef.current === "home";
    prevViewRef.current = currentView;

    const savedZoom = loadSavedCanvasZoom(null);
    const savedPan = loadSavedCanvasPan();
    const hasPersistedState = savedZoom !== null || savedPan !== null;

    const id = requestAnimationFrame(() => {
      const el = document.querySelector(".treewrap");
      if (!el || !layout.W) return;

      if (isReturningFromHome && hasPersistedState) {
        if (savedZoom !== null) {
          setZoom(savedZoom);
        }
        if (savedPan !== null) {
          el.scrollLeft = savedPan.scrollLeft;
          el.scrollTop = savedPan.scrollTop;
        }
      } else if (!hasPersistedState) {
        fitView();
      }
    });

    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeState.viewer, currentView]);

  const changeZoom = delta =>
    setZoom(z => {
      const next = clampCanvasZoom(z, delta);
      saveCanvasZoom(next);
      return next;
    });

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
    user && Boolean(activeTreeId) && canUserEditTree(activeTreeMeta, user)
  );
  const isStrictOwner = Boolean(
    user?.uid && activeTreeId && activeTreeMeta && activeTreeMeta.ownerUid === user.uid
  );

  useEffect(() => {
    let cancelled = false;
    if (!treeAccessDenied || !activeTreeId || !user?.uid) {
      setMyJoinRequest(null);
      return undefined;
    }
    getMyJoinRequest(activeTreeId, user).then(req => {
      if (!cancelled) setMyJoinRequest(req);
    });
    return () => {
      cancelled = true;
    };
  }, [treeAccessDenied, activeTreeId, user]);

  useEffect(() => {
    if (approveRequesterUid && isStrictOwner && activeTreeId) {
      setIsShareOpen(true);
    }
  }, [approveRequesterUid, isStrictOwner, activeTreeId]);
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
    recordDeletedId(id, activeTreeId || "public_demo");
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

  const handleUnlinkSpouse = (personId, spouseId) => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    setTreeState(prev => {
      const updatedCouples = prev.data.couples
        .map(c => {
          const match1 = c.h === personId && c.w === spouseId;
          const match2 = c.h === spouseId && c.w === personId;
          if (match1 || match2) {
            if (c.kids?.length) {
              return { ...c, w: "" };
            }
            return null;
          }
          return c;
        })
        .filter(Boolean);

      return {
        ...prev,
        data: {
          ...prev.data,
          couples: updatedCouples
        }
      };
    });
  };

  const handleUnlinkParents = personId => {
    if (!canEdit) return;
    isLocalMutationRef.current = true;
    setTreeState(prev => {
      const updatedCouples = prev.data.couples.map(c => {
        if (c.kids?.includes(personId)) {
          return {
            ...c,
            kids: c.kids.filter(k => k !== personId)
          };
        }
        return c;
      });

      return {
        ...prev,
        data: {
          ...prev.data,
          couples: updatedCouples
        }
      };
    });
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
    clearDeletedIds(activeTreeId || "public_demo");
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

  const openDemoTree = () => {
    if (hasPrivateTree) {
      handleNavigateMyTree();
      return;
    }
    isLocalMutationRef.current = false;
    setSaveError(false);
    setTreeLoadError(false);
    setLoadingTree(false);
    setTreeAccessDenied(false);
    setActiveTreeId("");
    setActiveTreeMeta(null);
    setTreeIdInUrl("");
    setTreeState(loadInitialTreeState());
    enterTree();
  };

  const handleSelectTree = (treeId, treeDoc) => {
    if (!treeId) {
      openDemoTree();
      return;
    }
    isLocalMutationRef.current = false;
    setSaveError(false);
    setTreeLoadError(false);
    setTreeAccessDenied(false);
    setActiveTreeId(treeId);
    setTreeIdInUrl(treeId);
    if (treeDoc?.data) {
      setLoadingTree(false);
      setActiveTreeMeta(treeDoc);
      const merged = mergeCloudTreeWithLocalHistory(
        treeId,
        treeDoc.data,
        treeDoc.photos || {},
        treeDoc.lang
      );
      setTreeState(prev => ({
        ...prev,
        data: merged.data,
        photos: merged.photos,
        lang: merged.lang || prev.lang,
        viewer: ""
      }));
    } else {
      setLoadingTree(true);
    }
    enterTree();
  };

  const handleNavigateHome = () => {
    setTreeAccessDenied(false);
    setCurrentView("home");
  };

  const handleNavigateDemo = () => {
    if (hasPrivateTree) {
      handleNavigateMyTree();
      return;
    }
    openDemoTree();
  };

  const handleNavigateMyTree = async () => {
    if (activeTreeId && currentView === "tree") return;
    const lastId = getLastPrivateTreeId();
    if (lastId) {
      handleSelectTree(lastId);
      return;
    }
    try {
      const multi = JSON.parse(localStorage.getItem("gupta_multi_trees_v1") || "{}") || {};
      const keys = Object.keys(multi);
      if (keys.length > 0) {
        handleSelectTree(keys[0], multi[keys[0]]);
        return;
      }
    } catch {}
    if (user) {
      try {
        const trees = await listAvailableTrees(user);
        const emailLower = user.email ? String(user.email).trim().toLowerCase() : "";
        const match =
          trees.find(tr => tr.ownerUid === user.uid && tr.id !== "tree_demo_sharma") ||
          trees.find(
            tr =>
              tr.id !== "tree_demo_sharma" &&
              (canUserEditTree(tr, user) ||
                (emailLower &&
                  Array.isArray(tr.viewerEmails) &&
                  tr.viewerEmails.some(e => String(e).trim().toLowerCase() === emailLower)))
          );
        if (match) {
          handleSelectTree(match.id, match);
          return;
        }
      } catch {}
      setIsCreateOpen(true);
    } else {
      setIsAuthOpen(true);
    }
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
    setTreeAccessDenied(false);
    setUserPrivateTreeId(created.id);
    setLastPrivateTreeId(created.id);
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
    setTreeAccessDenied(false);
    setUserPrivateTreeId(created.id);
    setLastPrivateTreeId(created.id);
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
    setTreeAccessDenied(false);
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
    setUserPrivateTreeId("");
    setSaveError(false);
    if (activeTreeId && (!activeTreeMeta || !activeTreeMeta.isPublic)) {
      isLocalMutationRef.current = false;
      setLoadingTree(false);
      setTreeLoadError(false);
      setTreeAccessDenied(false);
      setActiveTreeId("");
      setActiveTreeMeta(null);
      setTreeIdInUrl("");
      setTreeState(loadInitialTreeState());
    }
  };

  const handleUnlockLockedTreeByCode = async e => {
    e.preventDefault();
    setLockedCodeError("");
    const code = lockedCodeInput.trim();
    if (!code) return;
    try {
      const found = await findTreeByShareCode(code, activeTreeId);
      if (!found) {
        setLockedCodeError(t("joinByCodeNotFound"));
        return;
      }
      recordUnlockedShareCode(found.id, code);
      setLockedCodeInput("");
      setTreeAccessDenied(false);
      handleSelectTree(found.id, found);
    } catch (err) {
      if (err?.code === 'AUTH_REQUIRED') {
        setIsAuthOpen(true);
      } else if (err?.code === 'APPROVAL_REQUIRED') {
        await handleRequestTreeAccess(null, code);
      } else {
        setLockedCodeError(t("joinByCodeNotFound"));
      }
    }
  };

  const handleRequestTreeAccess = async (e, explicitCode = "") => {
    e?.preventDefault?.();
    if (!activeTreeId) return;
    if (!user?.uid) {
      setIsAuthOpen(true);
      return;
    }
    setRequestBusy(true);
    setRequestMsg("");
    setRequestNotifyLinks(null);
    try {
      const codeToSend = explicitCode || lockedCodeInput.trim() || getShareCodeFromUrl();
      const submitted = await submitJoinRequest(activeTreeId, {
        requestedRole: requestRole,
        shareCode: codeToSend,
        note: requestNote,
        user
      });
      setMyJoinRequest(submitted);
      const notifyRes = await sendOwnerJoinRequestEmail({
        treeId: activeTreeId,
        requesterUid: user.uid,
        requesterName: user.displayName || "",
        requesterEmail: user.email || "",
        requestedRole: requestRole
      });
      setRequestNotifyLinks(notifyRes);
      setRequestMsg(
        notifyRes.sent
          ? `${t("requestAccessSuccess")} ${t("ownerEmailSentAuto")}`
          : t("requestAccessSuccess")
      );
    } catch (err) {
      setRequestMsg(err?.message || "Could not submit access request.");
    } finally {
      setRequestBusy(false);
    }
  };

  const handleToggleSubTree = subTreeId => {
    setCollapsedSubTrees(prev => ({
      ...prev,
      [subTreeId]: !prev[subTreeId]
    }));
  };

  const handleEnsurePrivateShareLink = async () => {
    if (!activeTreeId) return "";
    let code = activeTreeMeta?.shareCode;
    if (!code && user && isOwner) {
      code = generatePrivateShareToken();
      await updateTreeSharingSettings(activeTreeId, { shareCode: code }, user);
      setActiveTreeMeta(prev => (prev ? { ...prev, shareCode: code } : prev));
    }
    return code ? buildPrivateShareUrl(activeTreeId, code) : "";
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
        activeTreeMeta={activeTreeMeta}
        isPrivateTree={Boolean(activeTreeMeta && activeTreeMeta.isPublic === false)}
        hasPrivateTree={hasPrivateTree}
        isOwner={isOwner}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenTreesModal={() => setIsCreateOpen(true)}
        onOpenShareModal={() => setIsShareOpen(true)}
        onCreatePrivateTree={() => setIsCreateOpen(true)}
        onEnsurePrivateShareLink={handleEnsurePrivateShareLink}
        onNavigateHome={handleNavigateHome}
        onNavigateDemo={handleNavigateDemo}
        onNavigateMyTree={handleNavigateMyTree}
        t={t}
        lang={treeState.lang}
        setLang={l => {
          isLocalMutationRef.current = true;
          setStoredLanguage(l);
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
        viewportMode={viewportMode}
        setViewportMode={setViewportMode}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />

      {currentView === "home" ? (
        <main id="main-content">
          <LandingPage
            t={t}
            lang={treeState.lang}
            hasPrivateTree={hasPrivateTree}
            memberCount={INITIAL_DATA.people.length}
            generationCount={5}
            branchCount={INITIAL_DATA.couples.length}
            onExplore={openDemoTree}
            onCreate={() => setIsCreateOpen(true)}
            onNavigateMyTree={handleNavigateMyTree}
          />
        </main>
      ) : loadingTree ? (
        <main id="main-content" className="page">
          <section className="private-locked-screen" aria-busy="true" aria-label={t("loadingTree")}>
            <div className="private-locked-card">
              <div className="private-locked-icon" aria-hidden="true">🌿</div>
              <h1 className="private-locked-title">{t("loadingTree")}</h1>
            </div>
          </section>
        </main>
      ) : treeAccessDenied ? (
        <main id="main-content" className="page">
          <section className="private-locked-screen" aria-labelledby="private-locked-heading">
            <div className="private-locked-card">
              <div className="private-locked-icon" aria-hidden="true">🔒</div>
              <h1 id="private-locked-heading" className="private-locked-title">
                {t("privateLockedTitle")}
              </h1>
              <p className="private-locked-body">{t("privateLockedBody")}</p>
              <div className="private-locked-actions">
                {!user && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    {t("privateLockedSignInBtn")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={handleNavigateHome}
                >
                  {t("privateLockedGoHomeBtn")}
                </button>
                {!hasPrivateTree && (
                  <button
                    type="button"
                    className="btn"
                    onClick={openDemoTree}
                  >
                    {t("privateLockedExploreDemoBtn")}
                  </button>
                )}
              </div>
              <form className="private-locked-code-form" onSubmit={handleUnlockLockedTreeByCode}>
                <input
                  type="text"
                  value={lockedCodeInput}
                  onChange={e => setLockedCodeInput(e.target.value)}
                  placeholder={t("joinByCodePh")}
                  aria-label={t("privateLockedCodeLabel")}
                />
                <button type="submit" className="btn primary">
                  {t("joinByCodeBtn")}
                </button>
              </form>
              {lockedCodeError && (
                <p className="msg" role="alert" style={{ marginTop: 10 }}>
                  {lockedCodeError}
                </p>
              )}
              {activeTreeId && user?.uid && (
                <form
                  onSubmit={handleRequestTreeAccess}
                  style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border, #d4d4d8)",
                    textAlign: "left",
                    display: "grid",
                    gap: 10
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{t("requestAccessTitle")}</strong>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    {t("requestAccessBody")}
                  </p>
                  {myJoinRequest?.status === "pending" && (
                    <p className="msg" style={{ margin: 0 }}>
                      ⏳ {t("requestAccessPending")}
                    </p>
                  )}
                  {myJoinRequest?.status === "rejected" && (
                    <p className="msg" style={{ margin: 0 }}>
                      {t("requestAccessRejected")}
                    </p>
                  )}
                  <div className="seg" role="group" aria-label={t("requestAccessRoleLabel")}>
                    <button
                      type="button"
                      className="zbtn"
                      aria-pressed={requestRole === "viewer"}
                      onClick={() => setRequestRole("viewer")}
                    >
                      {t("shareRoleViewer")}
                    </button>
                    <button
                      type="button"
                      className="zbtn"
                      aria-pressed={requestRole === "editor"}
                      onClick={() => setRequestRole("editor")}
                    >
                      {t("shareRoleEditor")}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={requestNote}
                    onChange={e => setRequestNote(e.target.value)}
                    placeholder={t("requestAccessNotePh")}
                    maxLength={300}
                  />
                  <button type="submit" className="btn primary" disabled={requestBusy}>
                    {requestBusy ? t("requestAccessSending") : t("requestAccessBtn")}
                  </button>
                  {requestMsg && (
                    <p className="msg" style={{ margin: 0 }}>
                      {requestMsg}
                    </p>
                  )}
                  {requestNotifyLinks && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a
                        href={requestNotifyLinks.mailtoUrl}
                        className="btn primary"
                        style={{ fontSize: 12, textDecoration: "none" }}
                      >
                        ✉ {t("notifyOwnerEmailBtn")}
                      </a>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12 }}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(requestNotifyLinks.approvalUrl);
                            setRequestMsg(t("copiedApprovalLinkMsg"));
                          } catch {}
                        }}
                      >
                        {t("copyApprovalLinkBtn")}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </section>
        </main>
      ) : treeLoadError ? (
        <main id="main-content" className="page">
          <section className="private-locked-screen" aria-labelledby="tree-load-error-heading">
            <div className="private-locked-card">
              <div className="private-locked-icon" aria-hidden="true">⚠️</div>
              <h1 id="tree-load-error-heading" className="private-locked-title">
                {t("treeLoadError")}
              </h1>
              <p className="private-locked-body">{t("treeLoadErrorBody")}</p>
              <div className="private-locked-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setTreeRetryCount(c => c + 1)}
                >
                  {t("retry")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleNavigateHome}
                >
                  {t("privateLockedGoHomeBtn")}
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main id="main-content" className="page">
          {saveError && (
            <div
              className="save-error-banner"
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 14px",
                marginBottom: "12px",
                borderRadius: "10px",
                border: "1px solid var(--accent, #b91c3b)",
                background: "var(--surface-2, #fff5f5)",
                color: "var(--ink)"
              }}
            >
              <span>{t("saveFailedBanner")}</span>
              <button type="button" className="btn primary" onClick={handleRetrySave}>
                {t("retry")}
              </button>
            </div>
          )}
          {/* Contextual Workspace Breadcrumbs */}
          <Breadcrumbs
            currentView={currentView}
            activeTreeId={activeTreeId}
            treeTitle={activeTreeMeta?.title || ""}
            activeTreeTitle={activeTreeMeta?.title || ""}
            viewer={treeState.viewer}
            viewerName={treeState.viewer ? displayName(treeState.viewer) : ""}
            onNavigateHome={handleNavigateHome}
            onNavigateDemo={handleNavigateDemo}
            onNavigatePrivateTree={handleNavigateMyTree}
            onResetPerspective={() => setTreeState(prev => ({ ...prev, viewer: "" }))}
            viewportMode={viewportMode}
            t={t}
          />

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
        onOpenRelationSolver={() => setIsRelationSolverOpen(true)}
        canEdit={canEdit}
        familyIndex={familyIndex}
      />

      {/* Interactive Canvas */}
      <Suspense
        fallback={
          <div
            className="treewrap treewrap-loading"
            aria-busy="true"
            style={{ display: "grid", placeItems: "center", minHeight: 360 }}
          >
            {t("loadingTree")}
          </div>
        }
      >
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
          collapsedSubTrees={collapsedSubTrees}
          onToggleSubTree={handleToggleSubTree}
        />
      </Suspense>

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
      <footer className="site-footer">
        <span>{t("foot")}</span>
        <span className="footer-links">
          <a
            href="https://github.com/arpitkumar81008-cmd"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub (@arpitkumar81008-cmd) ↗
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://github.com/arpitkumar81008-cmd/family-tree"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source Repository ↗
          </a>
        </span>
      </footer>

      {/* Person Detail Slide-Out / Modal */}
      {selectedPersonId && familyIndex.byId[selectedPersonId] && (
        <Suspense fallback={null}>
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
            onUnlinkSpouse={handleUnlinkSpouse}
            onUnlinkParents={handleUnlinkParents}
            canEdit={canEdit}
          />
        </Suspense>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && canEdit && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Help & Keyboard Shortcuts Modal */}
      {isHelpModalOpen && (
        <HelpModal
          lang={treeState.lang}
          close={() => setIsHelpModalOpen(false)}
        />
      )}

      {/* Relationship Solver Modal */}
      {isRelationSolverOpen && (
        <Suspense fallback={null}>
          <RelationSolverModal
            isOpen={isRelationSolverOpen}
            onClose={() => setIsRelationSolverOpen(false)}
            familyIndex={familyIndex}
            people={treeState.data.people}
            lang={treeState.lang}
            t={t}
            displayName={displayName}
            initialOriginId={treeState.viewer || selectedPersonId || ""}
            onSelectPerson={openPersonDetails}
          />
        </Suspense>
      )}
    </main>
      )}

      {isCreateOpen && !isAuthOpen && (
        <Suspense fallback={null}>
          <CreateTreeModal
            t={t}
            user={user}
            activeTreeId={activeTreeId}
            hasPrivateTree={hasPrivateTree}
            close={() => setIsCreateOpen(false)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSelectTree={handleSelectTree}
            onCreateBlank={handleCreateBlank}
            onImport={handleCreateImport}
            onRestore={handleCreateRestore}
          />
        </Suspense>
      )}

      {isShareOpen && !isAuthOpen && (
        <Suspense fallback={null}>
          <ShareTreeModal
            t={t}
            user={user}
            activeTreeId={activeTreeId}
            activeTreeMeta={activeTreeMeta}
            highlightRequesterUid={approveRequesterUid}
            onUpdateTreeMeta={patch =>
              setActiveTreeMeta(prev => (prev ? { ...prev, ...patch } : prev))
            }
            onSelectTree={handleSelectTree}
            onOpenAuth={() => setIsAuthOpen(true)}
            close={() => {
              setIsShareOpen(false);
              if (approveRequesterUid) setApproveRequesterUid("");
            }}
          />
        </Suspense>
      )}

      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal
            t={t}
            close={() => setIsAuthOpen(false)}
            onSignedIn={u => setUser(u)}
          />
        </Suspense>
      )}

      <OnboardingToast
        currentView={currentView}
        activeTab={activeTab}
        lang={treeState.lang}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
      />

      <MobileBottomNav
        currentView={currentView}
        activeTreeId={activeTreeId}
        hasPrivateTree={hasPrivateTree}
        onCreatePrivateTree={() => setIsCreateOpen(true)}
        onNavigateHome={handleNavigateHome}
        onNavigateDemo={handleNavigateDemo}
        onNavigateMyTree={handleNavigateMyTree}
        onToggleMenu={() => setIsSettingsOpen(prev => !prev)}
        isMenuOpen={isSettingsOpen}
        t={t}
      />
    </>
  );
}

export default App;
