import React, { useEffect, useRef, useState } from 'react';
import { validateTreeData, sanitizePhotosMap } from '../data/schema.js';
import {
  listAvailableTrees,
  findTreeByShareCode,
  canUserEditTree,
  isPhotosPayloadWithinLimit
} from '../services/treeSync.js';
import { useSmartAutoAnimate } from '../utils/useSmartAutoAnimate.js';

export function CreateTreeModal({
  t,
  user,
  activeTreeId,
  hasPrivateTree = false,
  close,
  onOpenAuth,
  onSelectTree,
  onCreateBlank,
  onImport,
  onRestore,
  onOpenShareModal
}) {
  const [treeTitle, setTreeTitle] = useState('');
  const [name, setName] = useState('');
  // Default to Private (false) to protect living family members' PII by default
  const [isPublic, setIsPublic] = useState(false);
  const [importText, setImportText] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [publicTrees, setPublicTrees] = useState([]);
  const ref = useRef(null);
  const firstRef = useRef(null);
  const directoryListRef = useSmartAutoAnimate();

  useEffect(() => {
    firstRef.current?.focus();
    listAvailableTrees(user)
      .then(list => {
        // Sort private/owned/shared trees first so the signed-in user immediately sees their family tree
        const sorted = [...list].sort((a, b) => {
          const aOwned = Boolean(user && (a.ownerUid === user.uid || canUserEditTree(a, user)));
          const bOwned = Boolean(user && (b.ownerUid === user.uid || canUserEditTree(b, user)));
          if (aOwned !== bOwned) return aOwned ? -1 : 1;
          return 0;
        });
        setPublicTrees(sorted);
      })
      .catch(() => {});
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

  const handleJoinByCode = async e => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;
    setBusy(true);
    setMsg('');
    try {
      const found = await findTreeByShareCode(clean);
      if (found) {
        onSelectTree?.(found.id, found);
        close();
      } else {
        setMsg(t('joinByCodeNotFound'));
      }
    } catch {
      setMsg(t('joinByCodeNotFound'));
    } finally {
      setBusy(false);
    }
  };

  const startBlank = async e => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }
    if (!name.trim()) {
      setMsg(t('createNeedName'));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await onCreateBlank({
        title: treeTitle.trim() || `${name.trim()} Family Tree`,
        rootName: name.trim(),
        isPublic
      });
    } catch (err) {
      setMsg(err?.message || 'Could not create tree. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    setMsg('');
    setBusy(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(importText);
      } catch {
        throw new Error(t('importBad'));
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(t('importBad'));
      }
      const res = validateTreeData(parsed.data);
      if (!res.valid) {
        throw new Error(res.error || t('importBad'));
      }

      const photos = sanitizePhotosMap(parsed.photos);
      if (!isPhotosPayloadWithinLimit(photos)) {
        setMsg(t('noSpace'));
        return;
      }

      await onImport({
        title: treeTitle.trim() || parsed.title || 'Imported Family Tree',
        data: parsed.data,
        photos,
        isPublic
      });
    } catch (err) {
      setMsg(err?.message || t('importBad'));
    } finally {
      setBusy(false);
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

        {/* 0. Quick Join by Family Access Code */}
        <form className="create-option reveal-parent" onSubmit={handleJoinByCode}>
          <h3>{t('joinByCodeTitle')}</h3>
          <p className="muted hover-explanation">{t('joinByCodeBody')}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            <input
              type="text"
              placeholder={t('joinByCodePh')}
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.toUpperCase());
                setMsg('');
              }}
              style={{ flex: '1 1 200px', textTransform: 'uppercase', fontWeight: 600 }}
            />
            <button type="submit" className="btn" disabled={busy || !joinCode.trim()}>
              {t('joinByCodeBtn')}
            </button>
          </div>
        </form>

        {/* 1. Always-Open Public & Personal Tree Directory */}
        <div className="create-option reveal-parent" tabIndex={0}>
          <h3>{t('browsePublicTitle')}</h3>
          <p className="muted hover-explanation">{t('browsePublicBody')}</p>
          <ul className="tree-directory" ref={directoryListRef}>
            {!hasPrivateTree && (
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
            )}
            {publicTrees
              .filter(tr => tr.id !== 'tree_demo_sharma' && (!hasPrivateTree || tr.id !== 'tree_demo_kapoor'))
              .map(tr => {
                const isUserOwner = Boolean(user && tr.ownerUid === user.uid);
                const isUserEditor = !isUserOwner && canUserEditTree(tr, user);
                const badgeText = isUserOwner
                  ? (!tr.isPublic ? t('privateBadge') : t('ownerBadge'))
                  : isUserEditor
                  ? t('coEditorBadge')
                  : !tr.isPublic
                  ? t('sharedWithYouBadge')
                  : t('readOnlyBadge');
                return (
                  <li key={tr.id}>
                    <div>
                      <strong>{tr.title}</strong>
                      <span className="muted">
                        {' '}
                        · {tr.data?.people?.length || 0} · {badgeText}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {isUserOwner && onOpenShareModal && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() => {
                            onSelectTree?.(tr.id, tr);
                            onOpenShareModal();
                          }}
                        >
                          {t('shareTreeBtn')}
                        </button>
                      )}
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
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>

        {/* 2. Auth Gate for Creating or Importing Your Own Tree */}
        {!user ? (
          <div className="create-option auth-gate-box reveal-parent" tabIndex={0}>
            <h3>{t('createBlankTitle')}</h3>
            <p className="muted hover-explanation">{t('authRequiredNotice')}</p>
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
            <form className="create-option reveal-parent" onSubmit={startBlank}>
              <h3>{t('createBlankTitle')}</h3>
              <p className="muted hover-explanation">{t('createBlankBody')}</p>
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
                    aria-pressed={!isPublic}
                    onClick={() => setIsPublic(false)}
                  >
                    {t('visPrivate')}
                  </button>
                  <button
                    type="button"
                    className="zbtn"
                    aria-pressed={isPublic}
                    onClick={() => setIsPublic(true)}
                  >
                    {t('visPublic')}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn" disabled={busy}>
                {t('createBlankStart')}
              </button>
            </form>

            <div className="create-option reveal-parent" tabIndex={0}>
              <h3>{t('createImportTitle')}</h3>
              <p className="muted hover-explanation">{t('createImportBody')}</p>
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
                disabled={!importText.trim() || busy}
                onClick={doImport}
              >
                {t('createImportBtn')}
              </button>
            </div>
          </>
        )}

        <div className="create-option reveal-parent" tabIndex={0}>
          <h3>{t('createRestoreTitle')}</h3>
          <p className="muted hover-explanation">{t('createRestoreBody')}</p>
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
