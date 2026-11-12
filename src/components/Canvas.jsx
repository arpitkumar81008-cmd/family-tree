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
  onToggleSubTree: onToggleSubTreeProp
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

  const subTrees = layout?.subTrees || [];

  const isSubTreeCollapsed = useCallback((id) => {
    return collapsedSubTrees instanceof Set
      ? collapsedSubTrees.has(id)
      : Boolean(collapsedSubTrees?.[id]);
  }, [collapsedSubTrees]);

  const handleToggleSubTree = useCallback((subTreeId) => {
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

  const handleFocusSubTree = useCallback((subTree) => {
    if (!subTree) return;
    if (isSubTreeCollapsed(subTree.id)) {
      handleToggleSubTree(subTree.id);
    }
    const el = containerRef.current;
    const bb = subTree.boundingBox;
    if (el && bb && bb.w > 0 && bb.h > 0) {
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
    }
    setIsSidebarOpen(false);
  }, [isSubTreeCollapsed, handleToggleSubTree, setZoom]);

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
  const layoutW = layout?.W || layout?.totalWidth || 0;
  const layoutH = layout?.H || layout?.totalHeight || 0;
  const subTreesLabel = (() => {
    const val = typeof t === 'function' ? t('subTreesTitle') : 'subTreesTitle';
    if (val && val !== 'subTreesTitle') return val;
    return lang === 'hi' ? 'उप-वंश' : 'Sub-Trees';
  })();

  return (
    <div ref={hostRef} className={`treewrap-host${isFullscreen ? ' is-fullscreen' : ''}`}>
      <div className="canvas-layout">
        {isSidebarOpen && (
          <div
            className="subtrees-drawer-backdrop"
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
          onClose={() => setIsSidebarOpen(false)}
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
                className="lines"
                width={layoutW}
                height={layoutH}
                viewBox={`0 0 ${layoutW} ${layoutH}`}
                aria-hidden="true"
              >
                {layout?.guideLines && (
                  <path className="guide-line" d={layout.guideLines} />
                )}
                {layout?.otherPath && (
                  <path className="other-branch-line" d={layout.otherPath} />
                )}
                {layout?.bridgePath && (
                  <path className="bridge-line" d={layout.bridgePath} />
                )}
                {layout?.mainPath && (
                  <path className="main-branch-line" d={layout.mainPath} />
                )}
                {!layout?.mainPath && !layout?.otherPath && layout?.path && (
                  <path className="main-branch-line" d={layout.path} />
                )}
              </svg>

              {/* Collapsible Sub-Tree Containers (Header-on-top, synced with SubTreesSidebar) */}
              {subTrees.map((st) => {
                const collapsed = isSubTreeCollapsed(st.id);
                const bb = st.boundingBox || { x: 0, y: 0, w: 0, h: 0 };
                return (
                  <div
                    key={st.id}
                    className={`canvas-subtree-box${st.isMain ? ' is-main' : ''}${collapsed ? ' is-collapsed' : ''}`}
                    style={{
                      left: `${Math.max(12, bb.x - 16)}px`,
                      top: `${Math.max(8, bb.y - 44)}px`,
                      width: collapsed ? 'auto' : `${Math.max(bb.w + 32, 240)}px`,
                      height: collapsed ? 'auto' : `${bb.h + 60}px`
                    }}
                  >
                    <div className="canvas-subtree-header">
                      <button
                        type="button"
                        className="canvas-subtree-toggle"
                        aria-expanded={!collapsed}
                        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${st.title}`}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleSubTree(st.id);
                        }}
                      >
                        <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
                      </button>
                      <span className="canvas-subtree-title">
                        <span aria-hidden="true">{st.isMain ? '★' : '✦'}</span> {st.title}
                      </span>
                      <span className="canvas-subtree-count">{st.memberIds?.length || 0}</span>
                    </div>
                  </div>
                );
              })}

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
              {(layout?.genLabels || []).map(g => (
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
      {/* Mobile Sub-Trees Drawer Toggle Button */}
      <button
        type="button"
        className="subtrees-drawer-toggle"
        aria-expanded={isSidebarOpen}
        aria-label={subTreesLabel}
        onClick={() => setIsSidebarOpen(prev => !prev)}
      >
        <span aria-hidden="true">🌿</span>
        <span>{subTreesLabel}</span>
      </button>
      {/* Floating Full-Screen Toggle Button */}
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
