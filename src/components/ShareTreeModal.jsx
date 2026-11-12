import React, { useEffect, useRef, useState } from 'react';
import {
  updateTreeSharingSettings,
  findTreeByShareCode,
  generatePrivateShareToken,
  buildPrivateShareUrl
} from '../services/treeSync.js';

export function ShareTreeModal({
  t,
  user,
  activeTreeId,
  activeTreeMeta,
  onUpdateTreeMeta,
  onSelectTree,
  onOpenAuth,
  close
}) {
  const isOwner = Boolean(
    user?.uid && activeTreeId && activeTreeMeta && activeTreeMeta.ownerUid === user.uid
  );

  const [isPublic, setIsPublic] = useState(Boolean(activeTreeMeta?.isPublic));
  const [shareCode, setShareCode] = useState(activeTreeMeta?.shareCode || '');
  const [shareCodeRole, setShareCodeRole] = useState(
    activeTreeMeta?.shareCodeRole === 'editor' ? 'editor' : 'viewer'
  );
  const [viewerEmails, setViewerEmails] = useState(
    Array.isArray(activeTreeMeta?.viewerEmails) ? activeTreeMeta.viewerEmails : []
  );
  const [editorEmails, setEditorEmails] = useState(
    Array.isArray(activeTreeMeta?.editorEmails) ? activeTreeMeta.editorEmails : []
  );

  const [emailInput, setEmailInput] = useState('');
  const [emailRole, setEmailRole] = useState('editor');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [msg, setMsg] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const ref = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    setIsPublic(Boolean(activeTreeMeta?.isPublic));
    setShareCode(activeTreeMeta?.shareCode || '');
    setShareCodeRole(activeTreeMeta?.shareCodeRole === 'editor' ? 'editor' : 'viewer');
    setViewerEmails(Array.isArray(activeTreeMeta?.viewerEmails) ? activeTreeMeta.viewerEmails : []);
    setEditorEmails(Array.isArray(activeTreeMeta?.editorEmails) ? activeTreeMeta.editorEmails : []);
  }, [activeTreeMeta]);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const applySharingPatch = async patch => {
    if (!isOwner || !activeTreeId) return;
    setBusy(true);
    setMsg('');
    try {
      const updated = await updateTreeSharingSettings(activeTreeId, patch, user);
      if (updated) {
        onUpdateTreeMeta?.(updated);
      }
    } catch (err) {
      setMsg(err?.message || 'Could not update sharing settings.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisibility = async nextPublic => {
    setIsPublic(nextPublic);
    await applySharingPatch({ isPublic: nextPublic });
  };

  const handleGenerateCode = () => {
    setShareCode(generatePrivateShareToken());
  };

  const handleSaveCode = async e => {
    e?.preventDefault?.();
    const clean = shareCode.trim().toUpperCase();
    setShareCode(clean);
    await applySharingPatch({
      shareCode: clean,
      shareCodeRole
    });
    setMsg(t('shareCodeSavedMsg'));
  };

  const handleCopyInviteLink = async () => {
    try {
      let cleanCode = shareCode.trim().toUpperCase();
      if (!cleanCode && isOwner && activeTreeId) {
        cleanCode = generatePrivateShareToken();
        setShareCode(cleanCode);
        await applySharingPatch({
          shareCode: cleanCode,
          shareCodeRole
        });
      }
      const shareUrl = buildPrivateShareUrl(activeTreeId, cleanCode);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyCode = async () => {
    try {
      const cleanCode = shareCode.trim().toUpperCase();
      if (!cleanCode) return;
      await navigator.clipboard.writeText(cleanCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleAddEmail = async e => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    let nextViewers = viewerEmails.filter(em => em !== cleanEmail);
    let nextEditors = editorEmails.filter(em => em !== cleanEmail);

    if (emailRole === 'editor') {
      nextEditors = [...nextEditors, cleanEmail];
    } else {
      nextViewers = [...nextViewers, cleanEmail];
    }

    setViewerEmails(nextViewers);
    setEditorEmails(nextEditors);
    setEmailInput('');
    await applySharingPatch({
      viewerEmails: nextViewers,
      editorEmails: nextEditors
    });
    setMsg(t('shareInviteAddedMsg'));
  };

  const handleRemoveEmail = async targetEmail => {
    const nextViewers = viewerEmails.filter(em => em !== targetEmail);
    const nextEditors = editorEmails.filter(em => em !== targetEmail);
    setViewerEmails(nextViewers);
    setEditorEmails(nextEditors);
    await applySharingPatch({
      viewerEmails: nextViewers,
      editorEmails: nextEditors
    });
  };

  const handleJoinByCode = async e => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) return;
    setBusy(true);
    setJoinMsg('');
    try {
      const found = await findTreeByShareCode(clean);
      if (found) {
        onSelectTree?.(found.id, found);
        close();
      } else {
        setJoinMsg(t('joinByCodeNotFound'));
      }
    } catch {
      setJoinMsg(t('joinByCodeNotFound'));
    } finally {
      setBusy(false);
    }
  };

  const allInvited = [
    ...editorEmails.map(email => ({ email, role: 'editor' })),
    ...viewerEmails.map(email => ({ email, role: 'viewer' }))
  ];

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div
        ref={ref}
        className="sheet create-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <button className="x" type="button" aria-label={t('close')} onClick={close}>
          ×
        </button>
        <h2 id="share-modal-title">{t('shareModalTitle')}</h2>
        <p className="muted" style={{ marginBottom: '16px' }}>
          {t('shareModalSub')}
        </p>

        {/* Quick Join by Family Access Code (for relatives visiting the site) */}
        <form className="create-option" onSubmit={handleJoinByCode}>
          <h3>{t('joinByCodeTitle')}</h3>
          <p className="muted" style={{ fontSize: '13px', marginBottom: '10px' }}>
            {t('joinByCodeBody')}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              ref={!isOwner ? firstRef : null}
              type="text"
              placeholder={t('joinByCodePh')}
              value={joinCodeInput}
              onChange={e => {
                setJoinCodeInput(e.target.value.toUpperCase());
                setJoinMsg('');
              }}
              style={{ flex: '1 1 200px', textTransform: 'uppercase', fontWeight: 600 }}
            />
            <button type="submit" className="btn" disabled={busy || !joinCodeInput.trim()}>
              {t('joinByCodeBtn')}
            </button>
          </div>
          {joinMsg && <p className="msg">{joinMsg}</p>}
        </form>

        {/* Owner Sharing Controls */}
        {isOwner ? (
          <>
            {/* 1. Tree Visibility Toggle */}
            <div className="create-option">
              <h3>{t('shareVisSectionTitle')}</h3>
              <p className="muted" style={{ fontSize: '13px', marginBottom: '10px' }}>
                {t('shareVisSectionSub')}
              </p>
              <div className="seg" role="group" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="zbtn"
                  aria-pressed={!isPublic}
                  disabled={busy}
                  onClick={() => handleToggleVisibility(false)}
                >
                  {t('shareVisPrivateBtn')}
                </button>
                <button
                  type="button"
                  className="zbtn"
                  aria-pressed={isPublic}
                  disabled={busy}
                  onClick={() => handleToggleVisibility(true)}
                >
                  {t('shareVisPublicBtn')}
                </button>
              </div>
            </div>

            {/* 2. Family Access Code & WhatsApp Invite Link */}
            <form className="create-option" onSubmit={handleSaveCode}>
              <h3>{t('shareCodeSectionTitle')}</h3>
              <p className="muted" style={{ fontSize: '13px', marginBottom: '10px' }}>
                {t('shareCodeSectionSub')}
              </p>
              <div className="field">
                <label htmlFor="share-code-input">{t('shareCodeLabel')}</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    ref={firstRef}
                    id="share-code-input"
                    type="text"
                    placeholder={t('shareCodePlaceholder')}
                    value={shareCode}
                    onChange={e => setShareCode(e.target.value.toUpperCase())}
                    style={{ flex: '1 1 160px', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="zbtn"
                    onClick={handleGenerateCode}
                  >
                    {t('shareCodeGenerateBtn')}
                  </button>
                  <button type="submit" className="btn" disabled={busy}>
                    {t('shareCodeSaveBtn')}
                  </button>
                </div>
              </div>

              <div className="field" style={{ marginTop: '10px' }}>
                <span className="lbl">{t('shareCodeRoleLabel')}</span>
                <div className="seg" role="group">
                  <button
                    type="button"
                    className="zbtn"
                    aria-pressed={shareCodeRole === 'viewer'}
                    onClick={async () => {
                      setShareCodeRole('viewer');
                      if (shareCode.trim()) {
                        await applySharingPatch({
                          shareCode: shareCode.trim().toUpperCase(),
                          shareCodeRole: 'viewer'
                        });
                      }
                    }}
                  >
                    {t('shareRoleViewer')}
                  </button>
                  <button
                    type="button"
                    className="zbtn"
                    aria-pressed={shareCodeRole === 'editor'}
                    onClick={async () => {
                      setShareCodeRole('editor');
                      if (shareCode.trim()) {
                        await applySharingPatch({
                          shareCode: shareCode.trim().toUpperCase(),
                          shareCodeRole: 'editor'
                        });
                      }
                    }}
                  >
                    {t('shareRoleEditor')}
                  </button>
                </div>
              </div>

              <div className="actions" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
                <button type="button" className="btn" onClick={handleCopyInviteLink}>
                  {copiedLink ? t('linkCopied') : t('shareCopyInviteLinkBtn')}
                </button>
                {shareCode.trim() && (
                  <button type="button" className="zbtn" onClick={handleCopyCode}>
                    {copiedCode
                      ? `${t('linkCopied')} (${shareCode.trim().toUpperCase()})`
                      : `${t('shareCopyCodeBtn')}: ${shareCode.trim().toUpperCase()}`}
                  </button>
                )}
              </div>
            </form>

            {/* 3. Invite Relatives by Email */}
            <div className="create-option">
              <h3>{t('shareEmailSectionTitle')}</h3>
              <p className="muted" style={{ fontSize: '13px', marginBottom: '10px' }}>
                {t('shareEmailSectionSub')}
              </p>
              <form
                onSubmit={handleAddEmail}
                style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}
              >
                <input
                  type="email"
                  placeholder={t('shareEmailInputPh')}
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
                <select
                  value={emailRole}
                  onChange={e => setEmailRole(e.target.value)}
                  style={{ height: '38px', padding: '0 10px' }}
                >
                  <option value="editor">{t('shareRoleEditor')}</option>
                  <option value="viewer">{t('shareRoleViewer')}</option>
                </select>
                <button type="submit" className="btn" disabled={busy || !emailInput.trim()}>
                  {t('shareEmailAddBtn')}
                </button>
              </form>

              {allInvited.length === 0 ? (
                <p className="muted" style={{ fontSize: '13px' }}>
                  {t('shareEmailListEmpty')}
                </p>
              ) : (
                <ul className="tree-directory">
                  {allInvited.map(item => (
                    <li key={item.email}>
                      <div>
                        <strong>{item.email}</strong>
                        <span className="muted">
                          {' '}
                          · {item.role === 'editor' ? t('shareRoleEditor') : t('shareRoleViewer')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => handleRemoveEmail(item.email)}
                      >
                        {t('shareEmailRemoveBtn')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {msg && <p className="msg">{msg}</p>}
          </>
        ) : (
          <div className="create-option">
            <h3>{t('shareCopyInviteLinkBtn')}</h3>
            <div className="actions">
              <button type="button" className="btn" onClick={handleCopyInviteLink}>
                {copiedLink ? t('linkCopied') : t('shareTreeBtn')}
              </button>
              {!user && (
                <button
                  type="button"
                  className="zbtn"
                  onClick={() => {
                    close();
                    onOpenAuth?.();
                  }}
                >
                  {t('signIn')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareTreeModal;
