import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'motion';
import { Card } from './Card.jsx';
import CanvasDock from './CanvasDock.jsx';
import { calculateKinship } from '../utils/kinship.js';

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
  onResetViewer
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const panRef = useRef({ active: false, hasDragged: false, sx: 0, sy: 0, sl: 0, st: 0 });

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

  return (
    <div className="treewrap-host">
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
            width: layout.W * zoom,
            height: layout.H * zoom
          }}
        >
          <div
            ref={stageRef}
            className="stage"
            style={{
              width: layout.W,
              height: layout.H,
              transform: `scale(${zoom})`
            }}
          >
            {/* SVG Connector Lines */}
            <svg
              className="lines"
              width={layout.W}
              height={layout.H}
              viewBox={`0 0 ${layout.W} ${layout.H}`}
              aria-hidden="true"
            >
              {layout.guideLines && (
                <path className="guide-line" d={layout.guideLines} />
              )}
              {layout.otherPath && (
                <path className="other-branch-line" d={layout.otherPath} />
              )}
              {layout.bridgePath && (
                <path className="bridge-line" d={layout.bridgePath} />
              )}
              {layout.mainPath && (
                <path className="main-branch-line" d={layout.mainPath} />
              )}
              {!layout.mainPath && !layout.otherPath && layout.path && (
                <path className="main-branch-line" d={layout.path} />
              )}
            </svg>

            {/* Branch Header Pills */}
            {(layout.branchLabels || []).map((b, idx) => (
              <div
                key={`br_${idx}`}
                className="branch-pill"
                style={{ left: `${b.x}px`, top: `${b.y}px` }}
              >
                {b.text}
              </div>
            ))}

            {/* Generation Rail & Pills */}
            {(layout.genLabels || []).map(g => (
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
              const pos = layout.pos[person.id];
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
                    if (!panRef.current.hasDragged) {
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
      <CanvasDock
        zoom={zoom}
        onZoomIn={() => onZoom(0.1)}
        onZoomOut={() => onZoom(-0.1)}
        onFit={fitView}
        onPan={handlePanBy}
        viewerName={viewer ? displayName(viewer) : ""}
        onReset={onResetViewer}
        t={t}
        lang={lang}
      />
    </div>
  );
}

export default Canvas;
