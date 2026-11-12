import React from 'react';

export function SubTreesSidebar({
  subTrees = [],
  collapsedSubTrees = {},
  onToggleSubTree,
  onFocusSubTree,
  onFocusMember,
  familyIndex,
  displayName,
  viewer = '',
  t,
  lang = 'en',
  isOpen = false,
  onClose
}) {
  const tr = (key, enFallback, hiFallback) => {
    const val = typeof t === 'function' ? t(key) : key;
    if (val && val !== key) return val;
    return lang === 'hi' ? hiFallback : enFallback;
  };

  const isCollapsed = (id) =>
    collapsedSubTrees instanceof Set
      ? collapsedSubTrees.has(id)
      : Boolean(collapsedSubTrees?.[id]);

  const resolveName = (id) => {
    if (typeof displayName === 'function') {
      const n = displayName(id);
      if (n) return n;
    }
    const p = familyIndex?.byId?.[id];
    if (!p) return id;
    return lang === 'hi' ? (p.hi || p.name) : p.name;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`subtrees-sidebar${isOpen ? ' is-open' : ''}`}
      aria-label={tr('subTreesTitle', 'Sub-Trees', 'उप-वंश')}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="subtrees-sidebar-head">
        <div className="subtrees-sidebar-title-wrap">
          <h2 className="subtrees-sidebar-title">
            {tr('subTreesTitle', 'Sub-Trees', 'उप-वंश')}
          </h2>
          {subTrees.length > 0 && (
            <span className="subtrees-sidebar-count" aria-label={tr('subTreesCount', 'Count', 'संख्या')}>
              {subTrees.length}
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            className="subtrees-sidebar-close"
            onClick={onClose}
            aria-label={tr('close', 'Close', 'बंद करें')}
          >
            ✕
          </button>
        )}
      </div>

      {subTrees.length === 0 ? (
        <div className="subtrees-empty">
          <p>
            {tr(
              'subTreesEmpty',
              'Sub-tree branches appear in Full Tree view.',
              'उप-वंश शाखाएँ पूर्ण वृक्ष दृश्य में दिखाई देती हैं।'
            )}
          </p>
        </div>
      ) : (
        <div className="subtrees-list" role="list">
          {subTrees.map((st) => {
            const collapsed = isCollapsed(st.id);
            const membersPanelId = `subtree-members-${st.id}`;

            return (
              <section
                key={st.id}
                role="listitem"
                className={`subtree-group${st.isMain ? ' is-main' : ''}${collapsed ? ' is-collapsed' : ''}`}
              >
                {/* Header-on-top: Sub-tree title sits cleanly above its preview/member container */}
                <div className="subtree-group-header">
                  <button
                    type="button"
                    className="subtree-toggle-btn"
                    aria-expanded={!collapsed}
                    aria-controls={membersPanelId}
                    aria-label={
                      collapsed
                        ? tr('expandSubTree', `Expand ${st.title}`, `${st.title} खोलें`)
                        : tr('collapseSubTree', `Collapse ${st.title}`, `${st.title} समेटें`)
                    }
                    onClick={() => onToggleSubTree?.(st.id)}
                  >
                    <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
                  </button>

                  <button
                    type="button"
                    className="subtree-title-btn"
                    onClick={() => onFocusSubTree?.(st)}
                    title={tr('focusSubTree', 'Focus on this branch', 'इस शाखा पर केंद्रित करें')}
                  >
                    <span className="subtree-kind-icon" aria-hidden="true">
                      {st.isMain ? '★' : '✦'}
                    </span>
                    <span className="subtree-title-text">{st.title}</span>
                    <span className="subtree-count">{st.memberIds?.length || 0}</span>
                  </button>
                </div>

                {/* Preview / Member container */}
                {!collapsed && (
                  <div id={membersPanelId} className="subtree-members">
                    {(st.memberIds || []).map((memberId) => {
                      const member = familyIndex?.byId?.[memberId];
                      const name = resolveName(memberId);
                      const isActive = viewer === memberId;

                      return (
                        <button
                          key={memberId}
                          type="button"
                          className={`subtree-member-btn${isActive ? ' is-active' : ''}`}
                          onClick={() => onFocusMember?.(memberId)}
                          title={tr('focusMember', `Focus on ${name}`, `${name} पर केंद्रित करें`)}
                        >
                          <span
                            className={`subtree-member-avatar${member?.g === 'F' ? ' is-female' : ''}`}
                            aria-hidden="true"
                          >
                            {getInitials(name)}
                          </span>
                          <span className="subtree-member-name">{name}</span>
                          {member?.late && (
                            <span className="subtree-member-late" aria-hidden="true">
                              †
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export default SubTreesSidebar;
