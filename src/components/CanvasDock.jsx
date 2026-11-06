import React from 'react';

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
  return (
    <div className="canvas-dock" role="group" aria-label={t('zoomGroup')}>
      <button
        type="button"
        className="dock-btn text dock-mode-btn"
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
          aria-label={isHi ? 'बाईं ओर खिसकाएँ' : 'Pan Left'}
          title={isHi ? 'बाईं ओर खिसकाएँ (←)' : 'Pan Left (←)'}
          onClick={() => onPan?.(-180, 0)}
        >
          ←
        </button>
        <button
          type="button"
          className="dock-btn"
          aria-label={isHi ? 'ऊपर खिसकाएँ' : 'Pan Up'}
          title={isHi ? 'ऊपर खिसकाएँ (↑)' : 'Pan Up (↑)'}
          onClick={() => onPan?.(0, -140)}
        >
          ↑
        </button>
        <button
          type="button"
          className="dock-btn"
          aria-label={isHi ? 'नीचे खिसकाएँ' : 'Pan Down'}
          title={isHi ? 'नीचे खिसकाएँ (↓)' : 'Pan Down (↓)'}
          onClick={() => onPan?.(0, 140)}
        >
          ↓
        </button>
        <button
          type="button"
          className="dock-btn"
          aria-label={isHi ? 'दाईं ओर खिसकाएँ' : 'Pan Right'}
          title={isHi ? 'दाईं ओर खिसकाएँ (→)' : 'Pan Right (→)'}
          onClick={() => onPan?.(180, 0)}
        >
          →
        </button>
      </div>

      <span className="dock-sep" aria-hidden="true" />

      <button type="button" className="dock-btn" aria-label={t('zoomOut')} onClick={onZoomOut}>
        −
      </button>
      <span className="dock-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" className="dock-btn" aria-label={t('zoomIn')} onClick={onZoomIn}>
        +
      </button>
      <button type="button" className="dock-btn text" onClick={onFit}>
        ⛶ {t('fit')}
      </button>
    </div>
  );
}

export default CanvasDock;
