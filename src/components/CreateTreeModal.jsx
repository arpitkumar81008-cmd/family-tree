import React, { useEffect, useRef, useState } from 'react';
import { validateTreeData } from '../data/schema.js';
import { listAvailableTrees } from '../services/treeSync.js';

export function CreateTreeModal({
  t,
  user,
  activeTreeId,
  close,
  onOpenAuth,
  onSelectTree,
  onCreateBlank,
  onImport,
  onRestore
}) {
  const [treeTitle, setTreeTitle] = useState('');
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [publicTrees, setPublicTrees] = useState([]);
  const ref = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    listAvailableTrees(user).then(setPublicTrees).catch(() => {});
    const onKey = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(
          ref.current.querySelectorAll('button:not([disabled]), input, textarea, select')
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close, user]);

  const startBlank = e => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }
    if (!name.trim()) {
      setMsg(t('createNeedName'));
      return;
    }
    onCreateBlank({
      title: treeTitle.trim() || `${name.trim()} Family Tree`,
      rootName: name.trim(),
      isPublic
    });
  };

  const doImport = () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    try {
      const parsed = JSON.parse(importText);
      const res = validateTreeData(parsed.data);
      if (!res.valid) throw new Error(res.error);
      onImport({
        title: treeTitle.trim() || parsed.title || 'Imported Family Tree',
        data: parsed.data,
        photos: parsed.photos && typeof parsed.photos === 'object' ? parsed.photos : undefined,
        isPublic
      });
    } catch {
      setMsg(t('importBad'));
    }
  };

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div
        ref={ref}
        className="sheet create-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
      >
        <button className="x" type="button" aria-label={t('close')} onClick={close}>
          ×
        </button>
        <h2 id="create-title">{t('createTitle')}</h2>

        {/* 1. Always-Open Public Tree Directory (No login required to view!) */}
        <div className="create-option">
          <h3>{t('browsePublicTitle')}</h3>
          <p className="muted">{t('browsePublicBody')}</p>
          <ul className="tree-directory">
            <li>
              <div>
                <strong>{t('canonicalTreeName')}</strong>
                <span className="muted"> · {t('readOnlyBadge')}</span>
              </div>
              <button
                ref={!user ? firstRef : null}
                type="button"
                className="chip"
                onClick={() => {
                  onSelectTree?.('');
                  close();
                }}
              >
                {activeTreeId === '' ? '✓ ' : ''}
                {t('openTreeBtn')}
              </button>
            </li>
            {publicTrees.map(tr => (
              <li key={tr.id}>
                <div>
                  <strong>{tr.title}</strong>
                  <span className="muted">
                    {' '}
                    · {tr.data?.people?.length || 0} ·{' '}
                    {user && tr.ownerUid === user.uid ? t('ownerBadge') : t('readOnlyBadge')}
                  </span>
                </div>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    onSelectTree?.(tr.id, tr);
                    close();
                  }}
                >
                  {activeTreeId === tr.id ? '✓ ' : ''}
                  {t('openTreeBtn')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Auth Gate for Creating or Importing Your Own Tree */}
        {!user ? (
          <div className="create-option auth-gate-box">
            <h3>{t('createBlankTitle')}</h3>
            <p className="muted">{t('authRequiredNotice')}</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onOpenAuth?.();
              }}
            >
              {t('signInToCreateBtn')}
            </button>
          </div>
        ) : (
          <>
            <form className="create-option" onSubmit={startBlank}>
              <h3>{t('createBlankTitle')}</h3>
              <p className="muted">{t('createBlankBody')}</p>
              <div className="field">
                <label htmlFor="ct-title">{t('treeTitleLabel')}</label>
                <input
                  ref={firstRef}
                  id="ct-title"
                  placeholder={t('treeTitlePh')}
                  value={treeTitle}
                  onChange={e => setTreeTitle(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ct-name">{t('createBlankName')}</label>
                <input
                  id="ct-name"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setMsg('');
                  }}
                />
              </div>
              <div className="field">
                <span className="lbl">{t('visibilityLabel')}</span>
                <div className="seg" role="group">
                  <button
                    type="button"
                    className="zbtn"
                    aria-pressed={isPublic}
                    onClick={() => setIsPublic(true)}
                  >
                    {t('visPublic')}
                  </button>
                  <button
                    type="button"
                    className="zbtn"
                    aria-pressed={!isPublic}
                    onClick={() => setIsPublic(false)}
                  >
                    {t('visPrivate')}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn">
                {t('createBlankStart')}
              </button>
            </form>

            <div className="create-option">
              <h3>{t('createImportTitle')}</h3>
              <p className="muted">{t('createImportBody')}</p>
              <div className="field">
                <label htmlFor="ct-import">{t('importLbl')}</label>
                <textarea
                  id="ct-import"
                  rows={3}
                  placeholder={t('importPh')}
                  value={importText}
                  onChange={e => {
                    setImportText(e.target.value);
                    setMsg('');
                  }}
                />
              </div>
              <button
                type="button"
                className="btn ghost"
                disabled={!importText.trim()}
                onClick={doImport}
              >
                {t('createImportBtn')}
              </button>
            </div>
          </>
        )}

        <div className="create-option">
          <h3>{t('createRestoreTitle')}</h3>
          <p className="muted">{t('createRestoreBody')}</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => (confirmRestore ? onRestore() : setConfirmRestore(true))}
            onBlur={() => setConfirmRestore(false)}
          >
            {confirmRestore ? t('resetSure') : t('createRestoreBtn')}
          </button>
        </div>

        {msg && (
          <p className="msg" role="status">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

export default CreateTreeModal;
