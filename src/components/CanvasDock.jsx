import React from 'react';

export function CanvasDock({ zoom, onZoomIn, onZoomOut, onFit, viewerName, onReset, t }) {
  return (
    <div className="canvas-dock" role="group" aria-label={t('zoomGroup')}>
      <span className="dock-pill">
        {viewerName ? t('dockViewing', viewerName) : t('dockMode')}
      </span>
      {viewerName && (
        <button type="button" className="dock-btn text" onClick={onReset}>
          ✕ {t('dockReset')}
        </button>
      )}
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
