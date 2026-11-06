import React, { useEffect, useRef, useState } from 'react';
import { validateTreeData } from '../data/schema.js';

export function CreateTreeModal({ t, close, onCreateBlank, onImport, onRestore }) {
  const [name, setName] = useState('');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const ref = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(
          ref.current.querySelectorAll('button:not([disabled]), input, textarea')
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
  }, [close]);

  const startBlank = e => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg(t('createNeedName'));
      return;
    }
    onCreateBlank(name.trim());
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText);
      const res = validateTreeData(parsed.data);
      if (!res.valid) throw new Error(res.error);
      onImport(parsed.data, parsed.photos && typeof parsed.photos === 'object' ? parsed.photos : undefined);
    } catch {
      setMsg(t('importBad'));
    }
  };

  return (
    <div
      className="overlay"
      onMouseDown={e => e.target === e.currentTarget && close()}
    >
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

        <form className="create-option" onSubmit={startBlank}>
          <h3>{t('createBlankTitle')}</h3>
          <p className="muted">{t('createBlankBody')}</p>
          <div className="field">
            <label htmlFor="ct-name">{t('createBlankName')}</label>
            <input
              ref={firstRef}
              id="ct-name"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setMsg('');
              }}
            />
          </div>
          <button type="submit" className="btn">{t('createBlankStart')}</button>
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

        {msg && <p className="msg" role="status">{msg}</p>}
      </div>
    </div>
  );
}

export default CreateTreeModal;
