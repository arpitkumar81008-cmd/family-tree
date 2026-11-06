import React, { useState } from 'react';

export function CanvasDock({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onPan,
  viewerName,
  onReset,
  t,
  lang
}) {
  const isHi = lang === 'hi';
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isPinned || isHovered;

  return (
    <div
      className={`canvas-dock collapsible-dock${isExpanded ? ' is-expanded' : ''}`}
      role="group"
      aria-label={t('zoomGroup')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="dock-controls-tray" aria-hidden={!isExpanded}>
        <button
          type="button"
          className="dock-btn text dock-mode-btn"
          tabIndex={isExpanded ? 0 : -1}
          title={isHi ? 'मूल वंश वृक्ष पर लौटें और फ़िट करें' : 'Reset to Full Lineage & Fit to Screen'}
          onClick={() => {
            onReset?.();
            onFit?.();
          }}
        >
          {viewerName ? `✕ ${t('dockViewing', viewerName)}` : `⟲ ${t('dockMode')}`}
        </button>

        <span className="dock-sep" aria-hidden="true" />

        {/* Directional Pan Controls */}
        <div className="dock-pan-group" role="group" aria-label={isHi ? 'दिशा नियंत्रण' : 'Pan canvas'}>
          <button
            type="button"
            className="dock-btn"
            tabIndex={isExpanded ? 0 : -1}
            aria-label={isHi ? 'बाईं ओर खिसकाएँ' : 'Pan Left'}
            title={isHi ? 'बाईं ओर खिसकाएँ (←)' : 'Pan Left (←)'}
            onClick={() => onPan?.(-180, 0)}
          >
            ←
          </button>
          <button
            type="button"
            className="dock-btn"
            tabIndex={isExpanded ? 0 : -1}
            aria-label={isHi ? 'ऊपर खिसकाएँ' : 'Pan Up'}
            title={isHi ? 'ऊपर खिसकाएँ (↑)' : 'Pan Up (↑)'}
            onClick={() => onPan?.(0, -140)}
          >
            ↑
          </button>
          <button
            type="button"
            className="dock-btn"
            tabIndex={isExpanded ? 0 : -1}
            aria-label={isHi ? 'नीचे खिसकाएँ' : 'Pan Down'}
            title={isHi ? 'नीचे खिसकाएँ (↓)' : 'Pan Down (↓)'}
            onClick={() => onPan?.(0, 140)}
          >
            ↓
          </button>
          <button
            type="button"
            className="dock-btn"
            tabIndex={isExpanded ? 0 : -1}
            aria-label={isHi ? 'दाईं ओर खिसकाएँ' : 'Pan Right'}
            title={isHi ? 'दाईं ओर खिसकाएँ (→)' : 'Pan Right (→)'}
            onClick={() => onPan?.(180, 0)}
          >
            →
          </button>
        </div>

        <span className="dock-sep" aria-hidden="true" />

        <button
          type="button"
          className="dock-btn"
          tabIndex={isExpanded ? 0 : -1}
          aria-label={t('zoomOut')}
          onClick={onZoomOut}
        >
          −
        </button>
        <span className="dock-zoom" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="dock-btn"
          tabIndex={isExpanded ? 0 : -1}
          aria-label={t('zoomIn')}
          onClick={onZoomIn}
        >
          +
        </button>
        <button
          type="button"
          className="dock-btn text"
          tabIndex={isExpanded ? 0 : -1}
          onClick={onFit}
        >
          ⛶ {t('fit')}
        </button>

        <span className="dock-sep" aria-hidden="true" />
      </div>

      {/* Compact Star Trigger Button in Bottom-Right Corner */}
      <button
        type="button"
        className={`dock-star-trigger${isPinned ? ' is-pinned' : ''}`}
        aria-label={t('dockToggleAria')}
        aria-expanded={isExpanded}
        title={
          isHi
            ? 'कैनवास नियंत्रण (होवर या क्लिक करें)'
            : 'Canvas Controls — Hover or click to expand/pin'
        }
        onClick={() => setIsPinned(p => !p)}
      >
        <span className="dock-star-icon" aria-hidden="true">✦</span>
      </button>
    </div>
  );
}

export default CanvasDock;
