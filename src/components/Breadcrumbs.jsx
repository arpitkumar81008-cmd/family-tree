import React from 'react';

/**
 * Breadcrumbs Component (Feature 5: Contextual Workspace Breadcrumbs)
 * 
 * Provides a contextual navigation trail allowing 1-click navigation up the hierarchy:
 * - Home view: [ Home ]
 * - Demo Tree (Overview): [ Home ] > [ Demo Tree ]
 * - Demo Tree (Perspective): [ Home ] > [ Demo Tree ] > [ Member Name ]
 * - Private Tree (Overview): [ Home ] > [ Tree Title ]
 * - Private Tree (Perspective): [ Home ] > [ Tree Title ] > [ Member Name ]
 *
 * Semantic & Accessible:
 * - <nav aria-label="Breadcrumb" className="workspace-breadcrumbs">
 * - <ol className="breadcrumb-list">
 * - Ancestors: clickable buttons for zero-reload navigation
 * - Current leaf: aria-current="page"
 * - Separators: aria-hidden="true"
 */
export function Breadcrumbs({
  currentView = 'tree',
  activeTreeId = '',
  treeTitle = '',
  activeTreeTitle = '',
  viewer = '',
  viewerName = '',
  onNavigateHome,
  onNavigateDemo,
  onNavigatePrivateTree,
  onResetPerspective,
  viewportMode = 'auto',
  t
}) {
  const translate = typeof t === 'function' ? t : (key => {
    const fallback = {
      breadcrumbHome: 'Home',
      breadcrumbDemo: 'Demo Tree',
      breadcrumbPerspective: 'Perspective',
      badgePrivateTree: 'Private Tree'
    };
    return fallback[key] || key;
  });

  const isDemo = !activeTreeId || activeTreeId === '';
  const resolvedTreeTitle = activeTreeTitle || treeTitle || (isDemo ? translate('breadcrumbDemo') : (translate('badgePrivateTree') || 'Private Tree'));
  const hasViewer = Boolean(viewerName && typeof viewerName === 'string' && viewerName.trim().length > 0);

  // If on Home view, render single leaf Home breadcrumb
  if (currentView === 'home') {
    return (
      <nav aria-label="Breadcrumb" className="workspace-breadcrumbs" data-viewport={viewportMode}>
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item current" aria-current="page">
            <span className="breadcrumb-current" aria-current="page">
              {translate('breadcrumbHome')}
            </span>
          </li>
        </ol>
      </nav>
    );
  }

  // Build segments for Tree view
  const segments = [];

  // Segment 1: Home (ancestor)
  segments.push({
    id: 'home',
    label: translate('breadcrumbHome'),
    isCurrent: false,
    onClick: onNavigateHome
  });

  // Segment 2: Tree (ancestor if viewer active, else leaf)
  if (hasViewer) {
    segments.push({
      id: 'tree',
      label: resolvedTreeTitle,
      isCurrent: false,
      onClick: onResetPerspective || (isDemo ? onNavigateDemo : onNavigatePrivateTree)
    });

    // Segment 3: Perspective Member (leaf)
    segments.push({
      id: 'perspective',
      label: viewerName.trim(),
      isCurrent: true
    });
  } else {
    segments.push({
      id: 'tree',
      label: resolvedTreeTitle,
      isCurrent: true
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="workspace-breadcrumbs" data-viewport={viewportMode}>
      <ol className="breadcrumb-list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <li
              key={segment.id}
              className={`breadcrumb-item${segment.isCurrent ? ' current' : ''}`}
              {...(segment.isCurrent ? { 'aria-current': 'page' } : {})}
            >
              {segment.isCurrent ? (
                <span
                  className="breadcrumb-current"
                  aria-current="page"
                  title={segment.label}
                >
                  {segment.label}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={segment.onClick}
                  title={segment.label}
                >
                  {segment.label}
                </button>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
