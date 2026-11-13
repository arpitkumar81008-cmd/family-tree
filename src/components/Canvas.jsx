import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { animate, stagger } from 'motion';
import { Card } from './Card.jsx';
import CanvasDock from './CanvasDock.jsx';
import SubTreesSidebar from './SubTreesSidebar.jsx';
import { calculateKinship } from '../utils/kinship.js';
import { saveCanvasPan, saveCanvasZoom } from '../utils/storage.js';

export function Canvas({
  treeState,
  familyIndex,
  layout,
  cardHeight,
  zoom,
  setZoom,
  fitView,
  searchQuery,
  searchMatches,
  viewer,
  lang,
  t,
  displayName,
  onCardClick,
  onZoom,
  onResetViewer,
  isFullscreen: isFullscreenProp,
  onToggleFullscreen: onToggleFullscreenProp,
  collapsedSubTrees: collapsedSubTreesProp,
  onToggleSubTree: onToggleSubTreeProp,
  highlightedPathIds = [],
  highlightedPathLabel = '',
  onClearHighlightedPath,
  focusedSearchId = ''
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const hostRef = useRef(null);
  const panRef = useRef({ active: false, hasDragged: false, sx: 0, sy: 0, sl: 0, st: 0 });
  const pinchRef = useRef({
    active: false,
    hasPinched: false,
    d0: 0,
    initialZoom: 1,
    midpoint: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    pending: null,
    rafId: null,
    debounceTimer: null
  });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;
  const prevFullscreenRef = useRef(isFullscreen);

  const [internalCollapsedSubTrees, setInternalCollapsedSubTrees] = useState({});
  const collapsedSubTrees = collapsedSubTreesProp !== undefined
    ? collapsedSubTreesProp
    : internalCollapsedSubTrees;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const subTrees = layout?.subTrees || [];

  const isSubTreeCollapsed = useCallback((id) => {
    return collapsedSubTrees instanceof Set
      ? collapsedSubTrees.has(id)
      : Boolean(collapsedSubTrees?.[id]);
  }, [collapsedSubTrees]);

  const lastToggledIdRef = useRef(null);
  const prevCollapsedKeyRef = useRef(null);

  const handleToggleSubTree = useCallback((subTreeId) => {
    lastToggledIdRef.current = subTreeId;
    if (onToggleSubTreeProp) {
      onToggleSubTreeProp(subTreeId);
    }
    if (collapsedSubTreesProp === undefined) {
      setInternalCollapsedSubTrees(prev => ({
        ...prev,
        [subTreeId]: !prev[subTreeId]
      }));
    }
  }, [collapsedSubTreesProp, onToggleSubTreeProp]);

  const hiddenMemberIds = useMemo(() => {
    const hidden = new Set();
    subTrees.forEach(st => {
      if (isSubTreeCollapsed(st.id)) {
        (st.memberIds || []).forEach(id => hidden.add(id));
      }
    });
    return hidden;
  }, [subTrees, isSubTreeCollapsed]);

  const { visibleMainPath, visibleOtherPath, visibleBridgePath } = useMemo(() => {
    const mainRaw = layout?.mainPath || '';
    const otherRaw = layout?.otherPath || '';
    const bridgeRaw = layout?.bridgePath || '';

    if (!subTrees.length || hiddenMemberIds.size === 0) {
      return { visibleMainPath: mainRaw, visibleOtherPath: otherRaw, visibleBridgePath: bridgeRaw };
    }

    const mainSubTree = subTrees.find(st => st.isMain || st.id === 'main');
    const isMainCollapsed = mainSubTree ? isSubTreeCollapsed(mainSubTree.id) : false;

    const collapsedNonMainBoxes = subTrees
      .filter(st => !st.isMain && st.id !== 'main' && isSubTreeCollapsed(st.id) && st.boundingBox)
      .map(st => st.boundingBox);

    const pointInBox = (x, y, bb, padX = 24, padTop = 24, padBot = 24) =>
      x >= bb.x - padX &&
      x <= bb.x + bb.w + padX &&
      y >= bb.y - padTop &&
      y <= bb.y + bb.h + padBot;

    const parseSeg = (cmd) => {
      const m = cmd.trim().match(/^M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*([HV])\s*(-?\d+(?:\.\d+)?)/i);
      if (!m) return null;
      const x1 = parseFloat(m[1]);
      const y1 = parseFloat(m[2]);
      const op = m[3].toUpperCase();
      const val = parseFloat(m[4]);
      const x2 = op === 'H' ? val : x1;
      const y2 = op === 'V' ? val : y1;
      return { cmd: cmd.trim(), x1, y1, op, x2, y2 };
    };

    const nextMainPath = isMainCollapsed ? '' : mainRaw;

    let nextOtherPath = otherRaw;
    if (otherRaw && collapsedNonMainBoxes.length > 0) {
      const segs = otherRaw.match(/M[^M]+/g) || [];
      nextOtherPath = segs
        .filter((raw) => {
          const s = parseSeg(raw);
          if (!s) return true;
          return !collapsedNonMainBoxes.some(
            bb => pointInBox(s.x1, s.y1, bb) || pointInBox(s.x2, s.y2, bb)
          );
        })
        .join(' ');
    }

    let nextBridgePath = '';
    if (!isMainCollapsed && bridgeRaw) {
      if (collapsedNonMainBoxes.length === 0) {
        nextBridgePath = bridgeRaw;
      } else {
        const segs = (bridgeRaw.match(/M[^M]+/g) || []).map(parseSeg).filter(Boolean);
        const kept = [];
        for (let i = 0; i < segs.length; i++) {
          const cur = segs[i];
          if (cur.op === 'H') {
            // Group [optional preceding V, this H, optional following V]
            const group = [];
            if (i > 0 && segs[i - 1].op === 'V' && Math.abs(segs[i - 1].x1 - cur.x1) < 0.5 && Math.abs(segs[i - 1].y2 - cur.y1) < 0.5) {
              // Remove preceding V from kept if it was pushed
              if (kept.length && kept[kept.length - 1] === segs[i - 1].cmd) {
                kept.pop();
              }
              group.push(segs[i - 1]);
            }
            group.push(cur);
            if (i + 1 < segs.length && segs[i + 1].op === 'V' && Math.abs(segs[i + 1].x1 - cur.x2) < 0.5 && Math.abs(segs[i + 1].y1 - cur.y1) < 0.5) {
              group.push(segs[i + 1]);
              i++;
            }
            const sourceCollapsed = collapsedNonMainBoxes.some(
              bb =>
                pointInBox(cur.x1, cur.y1, bb, 24, 24, 140) ||
                pointInBox(cur.x2, cur.y2, bb, 24, 24, 140)
            );
            if (!sourceCollapsed) {
              group.forEach(g => kept.push(g.cmd));
            }
          } else {
            kept.push(cur.cmd);
          }
        }
        nextBridgePath = kept.join(' ');
      }
    }

    return {
      visibleMainPath: nextMainPath,
      visibleOtherPath: nextOtherPath,
      visibleBridgePath: nextBridgePath
    };
  }, [layout, subTrees, hiddenMemberIds, isSubTreeCollapsed]);

  const focusBoundingBox = useCallback((bb) => {
    const el = containerRef.current;
    if (!el || !bb || bb.w <= 0 || bb.h <= 0) return;
    const pad = 64;
    const fitZoom = Math.min(
      1.1,
      Math.max(0.45, Math.min(el.clientWidth / (bb.w + pad * 2), el.clientHeight / (bb.h + pad * 2)))
    );
    const nextZoom = Number(fitZoom.toFixed(2));
    setZoom?.(nextZoom);
    saveCanvasZoom(nextZoom);
    requestAnimationFrame(() => {
      const targetLeft = Math.max(0, (bb.x + bb.w / 2) * nextZoom - el.clientWidth / 2);
      const targetTop = Math.max(0, (bb.y + bb.h / 2) * nextZoom - el.clientHeight / 2);
      el.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
      saveCanvasPan({ scrollLeft: targetLeft, scrollTop: targetTop });
    });
  }, [setZoom]);

  const handleFocusSubTree = useCallback((subTree) => {
    if (!subTree) return;
    if (isSubTreeCollapsed(subTree.id)) {
      handleToggleSubTree(subTree.id);
    }
    focusBoundingBox(subTree.boundingBox);
    setIsSidebarOpen(false);
  }, [isSubTreeCollapsed, handleToggleSubTree, focusBoundingBox]);

  const collapsedKey = useMemo(
    () => subTrees.map(st => `${st.id}:${isSubTreeCollapsed(st.id) ? 1 : 0}`).join('|'),
    [subTrees, isSubTreeCollapsed]
  );

  useEffect(() => {
    if (prevCollapsedKeyRef.current === null) {
      prevCollapsedKeyRef.current = collapsedKey;
      return;
    }
    if (prevCollapsedKeyRef.current === collapsedKey) return;
    prevCollapsedKeyRef.current = collapsedKey;

    if (!subTrees.length) return;
    const toggledId = lastToggledIdRef.current;
    lastToggledIdRef.current = null;
    const toggledTree = toggledId ? subTrees.find(st => st.id === toggledId) : null;
    const mainSubTree = subTrees.find(st => st.isMain || st.id === 'main');
    const openSubTrees = subTrees.filter(st => !isSubTreeCollapsed(st.id));
    const isMainOpen = mainSubTree ? !isSubTreeCollapsed(mainSubTree.id) : false;

    if (toggledTree && !isSubTreeCollapsed(toggledTree.id)) {
      focusBoundingBox(toggledTree.boundingBox);
      return;
    }

    if (isMainOpen && mainSubTree) {
      focusBoundingBox(mainSubTree.boundingBox);
    } else if (openSubTrees.length > 0) {
      focusBoundingBox(openSubTrees[0].boundingBox);
    } else {
      setZoom?.(1);
      saveCanvasZoom(1);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
        saveCanvasPan({ scrollLeft: 0, scrollTop: 0 });
        if (typeof window !== 'undefined' && window.scrollTo) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }, [collapsedKey, subTrees, isSubTreeCollapsed, focusBoundingBox, setZoom]);

  const handleFocusMember = useCallback((personId) => {
    if (!personId) return;
    const ownerSubTree = subTrees.find(st => (st.memberIds || []).includes(personId));
    if (ownerSubTree && isSubTreeCollapsed(ownerSubTree.id)) {
      handleToggleSubTree(ownerSubTree.id);
    }
    const el = containerRef.current;
    const pPos = layoutRef.current?.pos?.[personId];
    if (el && pPos) {
      const curZoom = zoomRef.current || 1;
      const targetZoom = curZoom < 0.8 ? 0.95 : curZoom;
      if (targetZoom !== curZoom) {
        setZoom?.(targetZoom);
        saveCanvasZoom(targetZoom);
      }
      requestAnimationFrame(() => {
        const targetLeft = Math.max(0, (pPos.x + 48) * targetZoom - el.clientWidth / 2);
        const targetTop = Math.max(0, (pPos.y + (cardHeight || 138) / 2) * targetZoom - el.clientHeight / 2);
        el.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
        saveCanvasPan({ scrollLeft: targetLeft, scrollTop: targetTop });
      });
    }
    setIsSidebarOpen(false);
  }, [subTrees, isSubTreeCollapsed, handleToggleSubTree, setZoom, cardHeight]);

  const handleToggleFullscreen = useCallback(async () => {
    const next = !isFullscreen;
    if (isFullscreenProp === undefined) {
      setInternalFullscreen(next);
    }
    onToggleFullscreenProp?.(next);

    if (next) {
      setIsSidebarOpen(false);
      try {
        const el = hostRef.current;
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
        } else if (document.documentElement?.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Progressive enhancement fallback to CSS overlay
      }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Progressive enhancement fallback to CSS overlay
      }
    }
  }, [isFullscreen, isFullscreenProp, onToggleFullscreenProp]);

  // Synchronize native fullscreen change events
  useEffect(() => {
    const onFullscreenChange = () => {
      const isDocFullscreen = Boolean(document.fullscreenElement);
      if (!isDocFullscreen && isFullscreen) {
        if (isFullscreenProp === undefined) {
          setInternalFullscreen(false);
        }
        onToggleFullscreenProp?.(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [isFullscreen, isFullscreenProp, onToggleFullscreenProp]);

  // Escape key handler when in full-screen mode (guarded against active modals)
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const hasOpenModal = document.querySelector('.overlay, .settings-popover');
        if (hasOpenModal) return;
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleToggleFullscreen]);

  // Coordinate and scroll position preservation across full-screen mode transitions
  useEffect(() => {
    if (prevFullscreenRef.current !== isFullscreen) {
      prevFullscreenRef.current = isFullscreen;
      const el = containerRef.current;
      if (el) {
        const sl = el.scrollLeft;
        const st = el.scrollTop;
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollLeft = sl;
            containerRef.current.scrollTop = st;
            saveCanvasPan({ scrollLeft: sl, scrollTop: st });
          }
        });
      }
    }
  }, [isFullscreen]);

  // Clean staggered card & SVG line entrance when switching perspective or loading tree
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    const isReduced =
      document.documentElement.getAttribute('data-motion') === 'reduce' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (isReduced) return;

    const cards = stageEl.querySelectorAll('.card');
    if (cards.length) {
      animate(
        cards,
        { opacity: [0, 1] },
        { delay: stagger(0.008), duration: 0.28, easing: [0.22, 1, 0.36, 1] }
      );
    }

    const lines = stageEl.querySelectorAll('.lines path');
    if (lines.length) {
      animate(
        lines,
        { opacity: [0, 1] },
        { duration: 0.35, easing: 'ease-out' }
      );
    }
  }, [viewer, treeState.data.people.length]);

  // Pan interaction with mouse drag
  useEffect(() => {
    const handleMouseMove = e => {
      if (!panRef.current.active || !containerRef.current) return;
      const dx = e.clientX - panRef.current.sx;
      const dy = e.clientY - panRef.current.sy;

      if (!panRef.current.hasDragged && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        panRef.current.hasDragged = true;
        containerRef.current.classList.add("is-panning");
      }

      if (panRef.current.hasDragged) {
        containerRef.current.scrollLeft = panRef.current.sl - dx;
        containerRef.current.scrollTop = panRef.current.st - dy;
      }
    };

    const handleMouseUp = () => {
      if (panRef.current.active) {
        panRef.current.active = false;
        containerRef.current?.classList.remove("is-panning");
        if (panRef.current.hasDragged && containerRef.current) {
          saveCanvasPan({
            scrollLeft: containerRef.current.scrollLeft,
            scrollTop: containerRef.current.scrollTop
          });
        }
        setTimeout(() => {
          panRef.current.hasDragged = false;
        }, 60);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Debounced container scroll listener to persist pan coordinates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeoutId = null;
    const onScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveCanvasPan({
          scrollLeft: el.scrollLeft,
          scrollTop: el.scrollTop
        });
      }, 150);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Touch Pinch-to-Zoom & Pan Engine (Milestone M3)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Crucial gesture isolation: call e.preventDefault() ONLY when e.touches.length === 2
        e.preventDefault();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const d0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const rect = el.getBoundingClientRect();
        const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
        const my = (t0.clientY + t1.clientY) / 2 - rect.top;
        const initialZ = zoomRef.current || 1.0;
        const sl = el.scrollLeft;
        const st = el.scrollTop;

        // Stage coordinates under midpoint:
        const stageX = (sl + mx) / initialZ;
        const stageY = (st + my) / initialZ;

        if (pinchRef.current.debounceTimer) {
          clearTimeout(pinchRef.current.debounceTimer);
          pinchRef.current.debounceTimer = null;
        }

        pinchRef.current.active = true;
        pinchRef.current.hasPinched = true;
        pinchRef.current.d0 = d0;
        pinchRef.current.initialZoom = initialZ;
        pinchRef.current.midpoint = { x: mx, y: my };
        pinchRef.current.anchor = { x: stageX, y: stageY };
        pinchRef.current.pending = null;
      }
    };

    const handleTouchMove = (e) => {
      // Single-finger touches (e.touches.length === 1) must NOT call preventDefault(),
      // allowing native momentum scrolling to work unimpeded.
      if (e.touches.length === 2) {
        e.preventDefault();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dCurr = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const rect = el.getBoundingClientRect();
        const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
        const my = (t0.clientY + t1.clientY) / 2 - rect.top;

        if (!pinchRef.current.active) {
          if (pinchRef.current.debounceTimer) {
            clearTimeout(pinchRef.current.debounceTimer);
            pinchRef.current.debounceTimer = null;
          }
          const initialZ = zoomRef.current || 1.0;
          const sl = el.scrollLeft;
          const st = el.scrollTop;

          pinchRef.current.active = true;
          pinchRef.current.hasPinched = true;
          pinchRef.current.d0 = dCurr;
          pinchRef.current.initialZoom = initialZ;
          pinchRef.current.midpoint = { x: mx, y: my };
          pinchRef.current.anchor = { x: (sl + mx) / initialZ, y: (st + my) / initialZ };
          pinchRef.current.pending = null;
          return;
        }

        const { d0, initialZoom, anchor } = pinchRef.current;
        // Division-by-zero safety: if D0 <= 0.0001, ratio is 1.0 (avoid NaN)
        const ratio = d0 > 0.0001 ? dCurr / d0 : 1.0;
        const rawZoom = initialZoom * ratio;
        // Zoom ratio clamped to [0.4, 1.4]
        const nextZoom = Math.min(1.4, Math.max(0.4, Number(rawZoom.toFixed(3))));

        // Focal scroll anchor
        const nextSL = Math.max(0, anchor.x * nextZoom - mx);
        const nextST = Math.max(0, anchor.y * nextZoom - my);

        pinchRef.current.hasPinched = true;
        pinchRef.current.pending = {
          zoom: nextZoom,
          sl: nextSL,
          st: nextST
        };

        // RAF batching: throttle DOM and zoom updates using requestAnimationFrame
        if (!pinchRef.current.rafId) {
          pinchRef.current.rafId = requestAnimationFrame(() => {
            pinchRef.current.rafId = null;
            const pending = pinchRef.current.pending;
            if (!pending) return;

            const containerEl = containerRef.current;
            const stageEl = stageRef.current;
            const sizerEl = containerEl?.querySelector('.sizer');
            const curLayout = layoutRef.current;
            const w = curLayout?.W || curLayout?.totalWidth || 0;
            const h = curLayout?.H || curLayout?.totalHeight || 0;

            if (sizerEl && w && h) {
              sizerEl.style.width = `${w * pending.zoom}px`;
              sizerEl.style.height = `${h * pending.zoom}px`;
            }
            if (stageEl) {
              stageEl.style.transform = `scale(${pending.zoom})`;
            }
            if (containerEl) {
              containerEl.scrollLeft = pending.sl;
              containerEl.scrollTop = pending.st;
            }

            setZoom(pending.zoom);
          });
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (pinchRef.current.active && e.touches.length < 2) {
        if (pinchRef.current.rafId) {
          cancelAnimationFrame(pinchRef.current.rafId);
          pinchRef.current.rafId = null;
        }

        const pending = pinchRef.current.pending;
        let finalZoom = zoomRef.current;
        let finalSL = el.scrollLeft;
        let finalST = el.scrollTop;

        if (pending) {
          finalZoom = pending.zoom;
          finalSL = pending.sl;
          finalST = pending.st;

          const containerEl = containerRef.current;
          const stageEl = stageRef.current;
          const sizerEl = containerEl?.querySelector('.sizer');
          const curLayout = layoutRef.current;
          const w = curLayout?.W || curLayout?.totalWidth || 0;
          const h = curLayout?.H || curLayout?.totalHeight || 0;

          if (sizerEl && w && h) {
            sizerEl.style.width = `${w * finalZoom}px`;
            sizerEl.style.height = `${h * finalZoom}px`;
          }
          if (stageEl) {
            stageEl.style.transform = `scale(${finalZoom})`;
          }
          if (containerEl) {
            containerEl.scrollLeft = finalSL;
            containerEl.scrollTop = finalST;
          }

          setZoom(finalZoom);
        }

        // Persistence: sync with saveCanvasZoom(finalZoom) and saveCanvasPan({ scrollLeft, scrollTop }) in touchend
        saveCanvasZoom(finalZoom);
        saveCanvasPan({ scrollLeft: finalSL, scrollTop: finalST });

        const wasPinched = pinchRef.current.hasPinched;
        pinchRef.current.active = false;
        pinchRef.current.pending = null;

        // Accidental card click suppression: maintain hasPinched flag in ref for 120ms debounce after touchend
        if (wasPinched) {
          if (pinchRef.current.debounceTimer) {
            clearTimeout(pinchRef.current.debounceTimer);
          }
          pinchRef.current.debounceTimer = setTimeout(() => {
            pinchRef.current.hasPinched = false;
            pinchRef.current.debounceTimer = null;
          }, 120);
        }
      }
    };

    const handleTouchCancel = () => {
      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
        pinchRef.current.rafId = null;
      }
      pinchRef.current.active = false;
      pinchRef.current.pending = null;
      if (pinchRef.current.debounceTimer) {
        clearTimeout(pinchRef.current.debounceTimer);
        pinchRef.current.debounceTimer = null;
      }
      pinchRef.current.hasPinched = false;
    };

    const handleClickCapture = (e) => {
      if (pinchRef.current.hasPinched) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
      }
    };

    // Attach non-passive { passive: false } listeners for touchstart, touchmove, touchend, touchcancel
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    el.addEventListener('click', handleClickCapture, { capture: true });

    return () => {
      if (pinchRef.current.rafId) {
        cancelAnimationFrame(pinchRef.current.rafId);
        pinchRef.current.rafId = null;
      }
      if (pinchRef.current.debounceTimer) {
        clearTimeout(pinchRef.current.debounceTimer);
        pinchRef.current.debounceTimer = null;
      }
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
      el.removeEventListener('click', handleClickCapture, { capture: true });
    };
  }, [setZoom]);

  // Smooth scroll to search target
  useEffect(() => {
    const el = containerRef.current;
    const targetPos = searchMatches[0] && layout.pos[searchMatches[0].id];
    if (el && targetPos) {
      el.scrollTo({
        left: Math.max(0, (targetPos.x + 48) * zoom - el.clientWidth / 2),
        top: Math.max(0, (targetPos.y + 60) * zoom - el.clientHeight / 2),
        behavior: "smooth"
      });
    }
  }, [searchQuery, searchMatches, layout, zoom]);

  const highlightedPathKey = Array.isArray(highlightedPathIds) ? highlightedPathIds.join('|') : '';
  const hasHighlightedPath = Array.isArray(highlightedPathIds) && highlightedPathIds.length > 0;

  // Apply .is-path-active / .is-path-dimmed classes to rendered cards
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pathSet = new Set(Array.isArray(highlightedPathIds) ? highlightedPathIds : []);
    const active = pathSet.size > 0;
    const cards = stage.querySelectorAll('.card[data-person-id]');
    cards.forEach(cardEl => {
      const pid = cardEl.getAttribute('data-person-id');
      const inPath = active && pathSet.has(pid);
      cardEl.classList.toggle('is-path-active', inPath);
      cardEl.classList.toggle('is-path-dimmed', active && !inPath);
    });
  }, [highlightedPathKey, highlightedPathIds, treeState.data.people, hiddenMemberIds, layout]);

  // Center on middle/first node when highlightedPathIds changes
  useEffect(() => {
    if (!Array.isArray(highlightedPathIds) || highlightedPathIds.length === 0) return;
    const midIdx = Math.floor((highlightedPathIds.length - 1) / 2);
    const targetId = highlightedPathIds[midIdx] || highlightedPathIds[0];
    if (!targetId) return;

    const ownerSubTree = subTrees.find(st => (st.memberIds || []).includes(targetId));
    if (ownerSubTree && isSubTreeCollapsed(ownerSubTree.id)) {
      handleToggleSubTree(ownerSubTree.id);
    }

    const el = containerRef.current;
    const pos = layoutRef.current?.pos?.[targetId];
    if (el && pos) {
      const curZoom = zoomRef.current || 1;
      requestAnimationFrame(() => {
        const targetLeft = Math.max(0, (pos.x + 48) * curZoom - el.clientWidth / 2);
        const targetTop = Math.max(0, (pos.y + (cardHeight || 138) / 2) * curZoom - el.clientHeight / 2);
        el.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
        saveCanvasPan({ scrollLeft: targetLeft, scrollTop: targetTop });
      });
    }
  }, [highlightedPathKey, cardHeight, subTrees, isSubTreeCollapsed, handleToggleSubTree]);

  // Smooth scroll/pan & brief pulse when focusedSearchId changes
  useEffect(() => {
    if (!focusedSearchId) return;
    const ownerSubTree = subTrees.find(st => (st.memberIds || []).includes(focusedSearchId));
    if (ownerSubTree && isSubTreeCollapsed(ownerSubTree.id)) {
      handleToggleSubTree(ownerSubTree.id);
    }

    const el = containerRef.current;
    const pos = layoutRef.current?.pos?.[focusedSearchId];
    if (el && pos) {
      const curZoom = zoomRef.current || 1;
      requestAnimationFrame(() => {
        const targetLeft = Math.max(0, (pos.x + 48) * curZoom - el.clientWidth / 2);
        const targetTop = Math.max(0, (pos.y + (cardHeight || 138) / 2) * curZoom - el.clientHeight / 2);
        el.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
        saveCanvasPan({ scrollLeft: targetLeft, scrollTop: targetTop });
      });
    }

    const stage = stageRef.current;
    const cardEl = stage?.querySelector(`.card[data-person-id="${focusedSearchId}"]`);
    if (cardEl) {
      cardEl.classList.remove('is-search-focus');
      void cardEl.offsetWidth;
      cardEl.classList.add('is-search-focus');
      const timer = setTimeout(() => {
        cardEl.classList.remove('is-search-focus');
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [focusedSearchId, cardHeight, subTrees, isSubTreeCollapsed, handleToggleSubTree]);

  const highlightedSvgPath = useMemo(() => {
    if (!Array.isArray(highlightedPathIds) || highlightedPathIds.length < 2) return '';
    const posMap = layout?.pos || {};
    const hHalf = (cardHeight || 138) / 2;
    const parts = [];
    for (let i = 0; i < highlightedPathIds.length - 1; i++) {
      const a = posMap[highlightedPathIds[i]];
      const b = posMap[highlightedPathIds[i + 1]];
      if (!a || !b) continue;
      const ax = a.x + 48;
      const ay = a.y + hHalf;
      const bx = b.x + 48;
      const by = b.y + hHalf;
      if (Math.abs(ay - by) < 12) {
        parts.push(`M ${ax} ${ay} L ${bx} ${by}`);
      } else {
        const midY = (ay + by) / 2;
        parts.push(`M ${ax} ${ay} V ${midY} H ${bx} V ${by}`);
      }
    }
    return parts.join(' ');
  }, [highlightedPathIds, layout, cardHeight]);

  const handlePanBy = (dx, dy) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, top: dy, behavior: "smooth" });
    setTimeout(() => {
      saveCanvasPan({
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop
      });
    }, 200);
  };

  // Spatial keyboard navigation
  const handleCardKeyDown = (e, personId) => {
    const vector = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1]
    }[e.key];

    if (vector) {
      e.preventDefault();
      const currentPos = layout.pos[personId];
      if (!currentPos) return;

      let bestId = null;
      let minDistance = Infinity;

      treeState.data.people.forEach(target => {
        if (target.id === personId) return;
        if (hiddenMemberIds.has(target.id)) return;
        if (searchQuery && !searchMatches.some(m => m.id === target.id)) return;
        const targetPos = layout.pos[target.id];
        if (!targetPos) return;

        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;

        if (vector[0] > 0 && dx <= 10) return;
        if (vector[0] < 0 && dx >= -10) return;
        if (vector[1] > 0 && dy <= 10) return;
        if (vector[1] < 0 && dy >= -10) return;

        const dist = vector[0]
          ? Math.abs(dx) + 2 * Math.abs(dy)
          : Math.abs(dy) + 2 * Math.abs(dx);

        if (dist < minDistance) {
          minDistance = dist;
          bestId = target.id;
        }
      });

      if (bestId) {
        stageRef.current?.querySelector(`[data-person-id="${bestId}"]`)?.focus();
      }
    }
  };

  const isSearchActive = !!searchQuery.trim();
  const rawLayoutW = layout?.W || layout?.totalWidth || 0;
  const rawLayoutH = layout?.H || layout?.totalHeight || 0;
  const openSubTreesList = useMemo(
    () => subTrees.filter(st => !isSubTreeCollapsed(st.id)),
    [subTrees, isSubTreeCollapsed]
  );
  const collapsedSubTreesList = useMemo(
    () => subTrees.filter(st => isSubTreeCollapsed(st.id)),
    [subTrees, isSubTreeCollapsed]
  );
  const allSubTreesCollapsed = subTrees.length > 0 && openSubTreesList.length === 0;
  const layoutW = allSubTreesCollapsed ? Math.min(rawLayoutW || 720, 720) : rawLayoutW;
  const layoutH = allSubTreesCollapsed ? 240 : rawLayoutH;
  const collapsedDockPos = useMemo(() => {
    if (!openSubTreesList.length) return { left: 16, top: 62 };
    const anchor = openSubTreesList.find(st => st.isMain || st.id === 'main') || openSubTreesList[0];
    const bb = anchor?.boundingBox || { x: 16, y: 62 };
    return {
      left: Math.max(16, bb.x - 16),
      top: Math.max(12, bb.y - 84)
    };
  }, [openSubTreesList]);
  const visibleGenLabels = useMemo(() => {
    const labels = layout?.genLabels || [];
    if (!subTrees.length) return labels;
    if (allSubTreesCollapsed) return [];
    const ys = openSubTreesList.map(st => st.boundingBox).filter(Boolean);
    if (!ys.length) return labels;
    const minY = Math.min(...ys.map(b => b.y)) - 60;
    const maxY = Math.max(...ys.map(b => b.y + b.h)) + 60;
    return labels.filter(g => g.labelY >= minY && g.labelY <= maxY);
  }, [layout, subTrees, openSubTreesList, allSubTreesCollapsed]);
  const subTreesLabel = (() => {
    const val = typeof t === 'function' ? t('subTreesTitle') : 'subTreesTitle';
    if (val && val !== 'subTreesTitle') return val;
    return lang === 'hi' ? 'उप-वंश' : 'Sub-Trees';
  })();

  return (
    <div
      ref={hostRef}
      className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}${
        isDesktopSidebarCollapsed && !isFullscreen ? ' is-sidebar-collapsed' : ''
      }`}
    >
      <div className="canvas-topbar">
        {/* Sub-Trees Drawer Toggle Button (mobile/tablet, fullscreen, or collapsed desktop) */}
        <button
          type="button"
          className="subtrees-drawer-toggle"
          aria-expanded={isFullscreen ? isSidebarOpen : !isDesktopSidebarCollapsed || isSidebarOpen}
          aria-label={subTreesLabel}
          onClick={() => {
            const isMobileMode =
              typeof document !== 'undefined' &&
              (document.documentElement.getAttribute('data-viewport') === 'mobile' ||
                window.innerWidth <= 900);
            if (isFullscreen || isMobileMode) {
              setIsSidebarOpen(prev => !prev);
            } else {
              setIsDesktopSidebarCollapsed(prev => !prev);
            }
          }}
        >
          <span aria-hidden="true">🌿</span>
          <span>{subTreesLabel}</span>
        </button>
        {/* Full-Screen Toggle Button */}
        <button
          type="button"
          className="canvas-fullscreen-toggle"
          aria-label={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
          title={isFullscreen ? t('fullscreenExit') : t('fullscreenEnter')}
          onClick={handleToggleFullscreen}
        >
          <span aria-hidden="true">{isFullscreen ? '✕' : '⛶'}</span>
          <span>{isFullscreen ? t('fullscreenExitShort') : t('fullscreenEnterShort')}</span>
        </button>
      </div>
      {hasHighlightedPath && (
        <div className="canvas-path-banner" role="status" aria-live="polite">
          <span className="canvas-path-banner-text">
            {lang === 'hi' ? 'संबंध मार्ग दिखाया जा रहा है' : 'Showing relation path'}
            {highlightedPathLabel ? `: ${highlightedPathLabel}` : ''}
          </span>
          {onClearHighlightedPath && (
            <button
              type="button"
              className="canvas-path-banner-clear"
              onClick={onClearHighlightedPath}
            >
              {lang === 'hi' ? 'साफ़ करें' : 'Clear'}
            </button>
          )}
        </div>
      )}
      <div className="canvas-layout">
        {isSidebarOpen && (
          <div
            className="subtrees-drawer-backdrop is-open"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <SubTreesSidebar
          subTrees={subTrees}
          collapsedSubTrees={collapsedSubTrees}
          onToggleSubTree={handleToggleSubTree}
          onFocusSubTree={handleFocusSubTree}
          onFocusMember={handleFocusMember}
          familyIndex={familyIndex}
          displayName={displayName}
          viewer={viewer}
          t={t}
          lang={lang}
          isOpen={isSidebarOpen}
          onClose={() => {
            setIsSidebarOpen(false);
            if (!isFullscreen) {
              setIsDesktopSidebarCollapsed(true);
            }
          }}
        />
        <div
          ref={containerRef}
          className="treewrap"
          tabIndex={0}
          role="region"
          aria-label={t("treeRegion")}
          onMouseDown={e => {
            if (e.button === 0 && containerRef.current) {
              panRef.current = {
                active: true,
                hasDragged: false,
                sx: e.clientX,
                sy: e.clientY,
                sl: containerRef.current.scrollLeft,
                st: containerRef.current.scrollTop
              };
            }
          }}
        >
          <div
            className="sizer"
            style={{
              width: layoutW * zoom,
              height: layoutH * zoom
            }}
          >
            <div
              ref={stageRef}
              className="stage"
              style={{
                width: layoutW,
                height: layoutH,
                transform: `scale(${zoom})`
              }}
            >
              {/* SVG Connector Lines */}
              <svg
                className={`lines${hasHighlightedPath ? ' is-path-dimmed' : ''}`}
                width={layoutW}
                height={layoutH}
                viewBox={`0 0 ${layoutW} ${layoutH}`}
                aria-hidden="true"
              >
                {layout?.guideLines && (
                  <path className="guide-line" d={layout.guideLines} />
                )}
                {visibleOtherPath && (
                  <path className="other-branch-line" d={visibleOtherPath} />
                )}
                {visibleBridgePath && (
                  <path className="bridge-line" d={visibleBridgePath} />
                )}
                {visibleMainPath && (
                  <path className="main-branch-line" d={visibleMainPath} />
                )}
                {!layout?.mainPath && !layout?.otherPath && layout?.path && (
                  <path className="main-branch-line" d={layout.path} />
                )}
                {highlightedSvgPath && (
                  <path className="relation-highlight-line" d={highlightedSvgPath} />
                )}
              </svg>

              {/* Open Sub-Tree Containers (Header-on-top, synced with SubTreesSidebar) */}
              {openSubTreesList.map((st) => {
                const bb = st.boundingBox || { x: 0, y: 0, w: 0, h: 0 };
                return (
                  <div
                    key={st.id}
                    className={`canvas-subtree-box${st.isMain ? ' is-main' : ''}`}
                    style={{
                      left: `${Math.max(12, bb.x - 16)}px`,
                      top: `${Math.max(8, bb.y - 44)}px`,
                      width: `${Math.max(bb.w + 32, 240)}px`,
                      height: `${bb.h + 60}px`
                    }}
                  >
                    <div className="canvas-subtree-header">
                      <button
                        type="button"
                        className="canvas-subtree-toggle"
                        aria-expanded={true}
                        aria-label={`Collapse ${st.title}`}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleSubTree(st.id);
                        }}
                      >
                        <span aria-hidden="true">▾</span>
                      </button>
                      <span className="canvas-subtree-title">
                        <span aria-hidden="true">{st.isMain ? '★' : '✦'}</span> {st.title}
                      </span>
                      <span className="canvas-subtree-count">{st.memberIds?.length || 0}</span>
                    </div>
                  </div>
                );
              })}

              {/* Collapsed Sub-Tree Pills (compacted at top/anchor so no blank space remains) */}
              {collapsedSubTreesList.length > 0 && (
                <div
                  className={`canvas-collapsed-dock${allSubTreesCollapsed ? ' is-all-collapsed' : ''}`}
                  style={{
                    left: `${collapsedDockPos.left}px`,
                    top: `${collapsedDockPos.top}px`
                  }}
                >
                  {collapsedSubTreesList.map((st) => (
                    <div
                      key={st.id}
                      className={`canvas-subtree-box${st.isMain ? ' is-main' : ''} is-collapsed`}
                    >
                      <div className="canvas-subtree-header">
                        <button
                          type="button"
                          className="canvas-subtree-toggle"
                          aria-expanded={false}
                          aria-label={`Expand ${st.title}`}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleSubTree(st.id);
                          }}
                        >
                          <span aria-hidden="true">▸</span>
                        </button>
                        <span className="canvas-subtree-title">
                          <span aria-hidden="true">{st.isMain ? '★' : '✦'}</span> {st.title}
                        </span>
                        <span className="canvas-subtree-count">{st.memberIds?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Branch Header Pills (Mode 2 / fallback when subTrees metadata is empty) */}
              {!subTrees.length && (layout?.branchLabels || []).map((b, idx) => (
                <div
                  key={`br_${idx}`}
                  className="branch-pill"
                  style={{ left: `${b.x}px`, top: `${b.y}px` }}
                >
                  {b.text}
                </div>
              ))}

              {/* Generation Rail & Pills */}
              {visibleGenLabels.map(g => (
                <div
                  key={g.g}
                  className="gen-rail"
                  style={{ top: `${g.labelY}px` }}
                >
                  <span className="gen-pill">{g.labelText}</span>
                </div>
              ))}

              {/* Member Cards */}
              {treeState.data.people.map(person => {
                if (hiddenMemberIds.has(person.id)) return null;
                const pos = layout?.pos?.[person.id];
                if (!pos) return null;

                const isMe = viewer === person.id;
                const isHit = isSearchActive && searchMatches.some(m => m.id === person.id);
                const isDim = isSearchActive && !isHit;

                const relLabel = viewer
                  ? calculateKinship(familyIndex, viewer, person.id, lang)[0]
                  : "";

                return (
                  <Card
                    key={person.id}
                    person={person}
                    pos={pos}
                    cardHeight={cardHeight}
                    relationLabel={relLabel}
                    photo={treeState.photos[person.id]}
                    isMe={isMe}
                    isHit={isHit}
                    isDim={isDim}
                    t={t}
                    displayName={displayName}
                    onClick={() => {
                      if (!panRef.current.hasDragged && !pinchRef.current.hasPinched) {
                        onCardClick(person.id);
                      }
                    }}
                    onKeyDown={e => handleCardKeyDown(e, person.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <CanvasDock
        zoom={zoom}
        onZoomIn={() => onZoom(0.1)}
        onZoomOut={() => onZoom(-0.1)}
        onFit={fitView}
        onPan={handlePanBy}
        viewerName={viewer ? displayName(viewer) : ""}
        onReset={onResetViewer}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        t={t}
        lang={lang}
      />
    </div>
  );
}

export default Canvas;
