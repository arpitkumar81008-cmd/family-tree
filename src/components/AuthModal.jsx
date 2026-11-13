import React, { useEffect, useRef, useState } from 'react';
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword
} from '../services/firebase.js';
import { useSmartAutoAnimate } from '../utils/useSmartAutoAnimate.js';
import {
  LOCAL_AUTH_KEY,
  loadLocalAuthUser,
  saveLocalAuthUser
} from '../utils/authStorage.js';

export { LOCAL_AUTH_KEY, loadLocalAuthUser, saveLocalAuthUser };

export function AuthModal({ t, close, onSignedIn }) {
  const cloudConfigured = isFirebaseConfigured();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const ref = useRef(null);
  const firstRef = useRef(null);
  const formAnimRef = useSmartAutoAnimate();

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const finishLocalDemoProfile = (emailAddr, nameStr) => {
    const cleanEmail = emailAddr.trim().toLowerCase();
    const uid =
      'local_' +
      Array.from(cleanEmail)
        .reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0)
        .toString(36)
        .replace('-', '');
    const userObj = {
      uid,
      email: cleanEmail,
      displayName: (nameStr || cleanEmail.split('@')[0] || 'Member').trim(),
      isLocalDemo: true
    };
    saveLocalAuthUser(userObj);
    onSignedIn?.(userObj);
    close();
  };

  const handleGoogle = async () => {
    if (!cloudConfigured) {
      setErr('Google Sign-In requires Firebase Cloud Auth to be configured. Use the local profile form below on this device.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const u = await signInWithGoogle();
      onSignedIn?.({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || u.email?.split('@')[0] || 'Member',
        photoURL: u.photoURL || ''
      });
      close();
    } catch (e) {
      setErr(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async e => {
    e.preventDefault();
    setErr('');
    setInfoMsg('');
    if (mode === 'reset') {
      if (!email.trim()) {
        setErr('Please enter your email address.');
        return;
      }
      setBusy(true);
      try {
        await resetPassword(email);
        setInfoMsg('Password reset email sent! Check your inbox (and spam folder).');
      } catch (e) {
        setErr(e?.message || 'Could not send password reset email.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email.trim() || password.length < 6) {
      setErr('Please enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (cloudConfigured) {
        const u =
          mode === 'signup'
            ? await signUpWithEmail(email, password, displayName)
            : await signInWithEmail(email, password);
        onSignedIn?.({
          uid: u.uid,
          email: u.email || email.trim(),
          displayName: u.displayName || displayName.trim() || email.split('@')[0]
        });
        close();
      } else {
        finishLocalDemoProfile(email, displayName);
      }
    } catch (e) {
      setErr(e?.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div
        ref={ref}
        className="sheet auth-sheet reveal-parent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button className="x" type="button" aria-label={t('close')} onClick={close}>
          ×
        </button>
        <h2 id="auth-title">{t('authTitle')}</h2>
        <p className="muted hover-explanation" style={{ marginBottom: 12 }}>
          {t('authSubtitle')}
        </p>

        {!cloudConfigured && (
          <p
            className="muted"
            role="note"
            style={{
              padding: '8px 10px',
              marginBottom: 14,
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '12px'
            }}
          >
            <strong>Local Demo Mode (This Device Only):</strong> Cloud Firebase keys are not configured on this deployment. Profiles and custom trees created below are stored in this browser&apos;s localStorage.
          </p>
        )}

        {cloudConfigured && (
          <>
            <button
              ref={firstRef}
              type="button"
              className="btn auth-google-btn"
              disabled={busy}
              onClick={handleGoogle}
              style={{ width: '100%' }}
            >
              G · {t('continueGoogle')}
            </button>

            <div className="auth-divider">
              <span>{t('orEmail')}</span>
            </div>
          </>
        )}

        <form className="newform" ref={formAnimRef} onSubmit={handleEmailSubmit}>
          {(mode === 'signup' || !cloudConfigured) && (
            <div className="field">
              <label htmlFor="auth-name">{t('displayNameLabel')}</label>
              <input
                ref={!cloudConfigured ? firstRef : null}
                id="auth-name"
                value={displayName}
                placeholder="e.g. Your Name"
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">{t('emailLabel')}</label>
            <input
              ref={cloudConfigured && mode !== 'signup' ? firstRef : null}
              id="auth-email"
              type="email"
              required
              value={email}
              placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'reset' && (
            <div className="field">
              <label htmlFor="auth-pass">{t('passwordLabel')}</label>
              <input
                id="auth-pass"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          )}

          {err && (
            <p className="msg" role="status">
              {err}
            </p>
          )}

          {infoMsg && (
            <p className="msg" role="status" style={{ color: 'var(--accent, #2e7d32)' }}>
              {infoMsg}
            </p>
          )}

          <div className="actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <button type="submit" className="btn" disabled={busy}>
              {mode === 'reset'
                ? 'Send Reset Link'
                : mode === 'signup'
                  ? t('signUp')
                  : t('signIn')}
            </button>
            {cloudConfigured && mode === 'signin' && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setMode('reset');
                  setErr('');
                  setInfoMsg('');
                }}
              >
                Forgot password?
              </button>
            )}
            {cloudConfigured && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setMode(m => (m === 'signup' ? 'signin' : m === 'reset' ? 'signin' : 'signup'));
                  setErr('');
                  setInfoMsg('');
                }}
              >
                {mode === 'signup' || mode === 'reset'
                  ? t('switchToSignIn')
                  : t('switchToSignUp')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
