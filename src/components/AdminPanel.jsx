import React, { useEffect, useMemo, useState } from 'react';
import { fetchAnalyticsDaily, isUserAdmin } from '../services/analyticsStats';

const FIREBASE_PROJECT_ID = 'gupta-family-tree-akg';

const CONSOLE_LINKS = [
  {
    label: 'Google Analytics (GA4)',
    description: 'Real-time visitors, traffic sources, devices & retention',
    href: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/analytics/app/web`,
  },
  {
    label: 'Firebase Hosting',
    description: 'Bandwidth, requests, releases & custom domain status',
    href: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/hosting/sites`,
  },
  {
    label: 'Firestore Database & Usage',
    description: 'Reads, writes, storage quota & admins collection',
    href: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore`,
  },
  {
    label: 'Authentication Users',
    description: 'Registered accounts, providers & user UIDs',
    href: `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/users`,
  },
];

export default function AdminPanel({
  user,
  onSignIn,
  onBackHome,
  memberCount = 0,
  familyCount = 0,
}) {
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [dailyRows, setDailyRows] = useState([]);
  const [copiedUid, setCopiedUid] = useState(false);

  const loadAnalytics = async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const rows = await fetchAnalyticsDaily(30);
      setDailyRows(rows);
    } catch (err) {
      setStatsError(err?.message || 'Unable to load analytics data.');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setAdminAuthorized(false);
      setCheckingAdmin(false);
      return () => {
        active = false;
      };
    }

    setCheckingAdmin(true);
    isUserAdmin(user)
      .then((ok) => {
        if (!active) return;
        setAdminAuthorized(ok);
        if (ok) {
          loadAnalytics();
        }
      })
      .finally(() => {
        if (active) setCheckingAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const totals = useMemo(() => {
    return dailyRows.reduce(
      (acc, row) => ({
        pageViews: acc.pageViews + row.pageViews,
        treesCreated: acc.treesCreated + row.treesCreated,
        photosUploaded: acc.photosUploaded + row.photosUploaded,
        relationsSolved: acc.relationsSolved + row.relationsSolved,
        joinRequests: acc.joinRequests + row.joinRequests,
      }),
      {
        pageViews: 0,
        treesCreated: 0,
        photosUploaded: 0,
        relationsSolved: 0,
        joinRequests: 0,
      }
    );
  }, [dailyRows]);

  const handleCopyUid = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      setCopiedUid(false);
    }
  };

  const kpiCards = [
    { label: 'Page Views (30d)', value: totals.pageViews, badge: '👁️' },
    { label: 'Trees Created (30d)', value: totals.treesCreated, badge: '🌿' },
    { label: 'Photos Uploaded (30d)', value: totals.photosUploaded, badge: '🖼️' },
    { label: 'Relations Solved (30d)', value: totals.relationsSolved, badge: '🧭' },
    { label: 'Join Requests (30d)', value: totals.joinRequests, badge: '🤝' },
  ];

  return (
    <div className="admin-panel-root">
      <style>{`
        .admin-panel-root {
          min-height: calc(100vh - 64px);
          background: var(--bg, #FAF8F5);
          color: var(--ink, #1B2432);
          padding: 24px 16px 48px;
        }
        .admin-panel-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .admin-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line, #E6DFD5);
        }
        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .admin-title {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .admin-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }
        .admin-auth-card {
          max-width: 640px;
          margin: 24px auto 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .admin-uid-box {
          background: var(--bg, #FAF8F5);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .admin-uid-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
          word-break: break-all;
        }
        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
          gap: 14px;
        }
        .admin-kpi-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .admin-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--muted, #6B7280);
          font-weight: 600;
        }
        .admin-kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .admin-table-wrap {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 16px;
          overflow: hidden;
        }
        .admin-table-head {
          padding: 14px 18px;
          border-bottom: 1px solid var(--line, #E6DFD5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .admin-table-scroll {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .admin-table th,
        .admin-table td {
          padding: 11px 16px;
          border-bottom: 1px solid var(--line, #E6DFD5);
          text-align: right;
          white-space: nowrap;
        }
        .admin-table th:first-child,
        .admin-table td:first-child {
          text-align: left;
        }
        .admin-table th {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted, #6B7280);
          background: var(--bg, #FAF8F5);
        }
        .admin-table tr:last-child td {
          border-bottom: none;
        }
        .admin-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 14px;
        }
        .admin-console-link {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 14px;
          padding: 16px;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .admin-console-link:hover {
          border-color: var(--accent, #B91C1C);
          transform: translateY(-1px);
        }
        .admin-muted {
          color: var(--muted, #6B7280);
          font-size: 0.875rem;
        }
        .admin-error {
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(185, 28, 28, 0.08);
          border: 1px solid rgba(185, 28, 28, 0.25);
          color: #991B1B;
          font-size: 0.875rem;
        }
      `}</style>

      <div className="admin-panel-inner">
        <div className="admin-header">
          <div className="admin-header-left">
            <button type="button" className="btn" onClick={onBackHome}>
              ← Back to App
            </button>
            <h1 className="admin-title">📊 Admin Analytics Panel</h1>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="admin-muted">{user.email || user.displayName || user.uid}</span>
              {adminAuthorized && <span className="admin-badge">✓ Admin Verified</span>}
            </div>
          )}
        </div>

        {!user ? (
          <section className="admin-card admin-auth-card" style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Sign in to access Admin Analytics</h2>
            <p className="admin-muted" style={{ margin: 0 }}>
              Only administrator UIDs registered in Firestore <code>admins/{'{uid}'}</code> can
              view aggregate website analytics.
            </p>
            <div>
              <button type="button" className="btn primary" onClick={onSignIn}>
                Sign in with Google
              </button>
            </div>
          </section>
        ) : checkingAdmin ? (
          <section className="admin-card admin-auth-card" style={{ textAlign: 'center' }}>
            <p className="admin-muted" style={{ margin: 0 }}>
              Verifying administrator permissions...
            </p>
          </section>
        ) : !adminAuthorized ? (
          <section className="admin-card admin-auth-card">
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
              Admin Access Not Enabled for This Account
            </h2>
            <p className="admin-muted" style={{ margin: 0 }}>
              To keep personal emails out of source code and stay on the free Firebase Spark plan,
              admin access is granted via a Firestore document matching your User UID.
            </p>
            <div className="admin-uid-box">
              <div>
                <div className="admin-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>
                  YOUR FIREBASE AUTH UID
                </div>
                <code className="admin-uid-code">{user.uid}</code>
              </div>
              <button type="button" className="btn" onClick={handleCopyUid}>
                {copiedUid ? '✓ Copied' : 'Copy UID'}
              </button>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
              <li>
                Open{' '}
                <a
                  href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/-default-/data`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Firebase Console → Firestore Database ↗
                </a>
              </li>
              <li>
                Create collection <code>admins</code> and add a document whose{' '}
                <strong>Document ID</strong> is your UID above (for example{' '}
                <code>role: &quot;owner&quot;</code>).
              </li>
              <li>Reload this page to unlock the dashboard.</li>
            </ol>
          </section>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>30-Day Website Activity</h2>
                <p className="admin-muted" style={{ margin: '4px 0 0' }}>
                  Aggregate daily counters stored in Firestore alongside Google Analytics 4 (
                  <code>G-89GMEHC09H</code>).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="admin-muted">
                  Active workspace: <strong>{memberCount}</strong> members /{' '}
                  <strong>{familyCount}</strong> branches
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={loadAnalytics}
                  disabled={loadingStats}
                >
                  {loadingStats ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>
            </div>

            {statsError && <div className="admin-error">{statsError}</div>}

            <section className="admin-kpi-grid">
              {kpiCards.map((card) => (
                <div key={card.label} className="admin-kpi-card">
                  <div className="admin-kpi-top">
                    <span>{card.label}</span>
                    <span aria-hidden="true">{card.badge}</span>
                  </div>
                  <div className="admin-kpi-value">{card.value.toLocaleString()}</div>
                </div>
              ))}
            </section>

            <section className="admin-table-wrap">
              <div className="admin-table-head">
                <strong>Daily Breakdown (Last 30 Days)</strong>
                <span className="admin-muted">
                  {dailyRows.length} day{dailyRows.length === 1 ? '' : 's'} recorded
                </span>
              </div>
              {dailyRows.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center' }} className="admin-muted">
                  {loadingStats
                    ? 'Loading daily analytics...'
                    : 'No daily analytics recorded yet. Activity counters will appear here as visitors use the site.'}
                </div>
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Page Views</th>
                        <th>Trees Created</th>
                        <th>Photos Uploaded</th>
                        <th>Relations Solved</th>
                        <th>Join Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((row) => (
                        <tr key={row.date}>
                          <td>
                            <code>{row.date}</code>
                          </td>
                          <td>{row.pageViews.toLocaleString()}</td>
                          <td>{row.treesCreated.toLocaleString()}</td>
                          <td>{row.photosUploaded.toLocaleString()}</td>
                          <td>{row.relationsSolved.toLocaleString()}</td>
                          <td>{row.joinRequests.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>
                External Firebase &amp; Google Analytics Consoles
              </h3>
              <div className="admin-links-grid">
                {CONSOLE_LINKS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-console-link"
                  >
                    <strong style={{ fontSize: '0.95rem' }}>{item.label} ↗</strong>
                    <span className="admin-muted" style={{ fontSize: '0.8rem' }}>
                      {item.description}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
