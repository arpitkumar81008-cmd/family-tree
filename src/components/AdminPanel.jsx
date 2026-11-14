import React, { useEffect, useMemo, useState } from 'react';
import { fetchAnalyticsDaily, getTodayDateKey, isUserAdmin } from '../services/analyticsStats';

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

  const chartData = useMemo(() => {
    if (!dailyRows.length) return [];
    return [...dailyRows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        actions:
          row.treesCreated +
          row.photosUploaded +
          row.relationsSolved +
          row.joinRequests,
      }));
  }, [dailyRows]);

  const todayVsAvg = useMemo(() => {
    const todayDate = new Date();
    const todayKey = getTodayDateKey(todayDate);
    const sevenDaysAgo = new Date(todayDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const cutoffKey = getTodayDateKey(sevenDaysAgo);

    const todayRow = dailyRows.find((r) => r.date === todayKey);
    const recentRows = dailyRows.filter(
      (r) => r.date >= cutoffKey && r.date <= todayKey
    );

    const keys = [
      'pageViews',
      'treesCreated',
      'photosUploaded',
      'relationsSolved',
      'joinRequests',
    ];
    const result = {};
    for (const key of keys) {
      const todayVal = todayRow ? todayRow[key] || 0 : 0;
      const sum7 = recentRows.reduce((sum, r) => sum + (r[key] || 0), 0);
      const avg7 = sum7 / 7;
      let deltaText = '—';
      let deltaTone = 'neutral';
      if (avg7 > 0) {
        const pct = Math.round(((todayVal - avg7) / avg7) * 100);
        deltaText = `${pct > 0 ? '+' : ''}${pct}%`;
        deltaTone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
      } else if (todayVal > 0) {
        deltaText = 'New';
        deltaTone = 'up';
      }
      result[key] = {
        today: todayVal,
        avg7,
        avg7Label: avg7 >= 10 ? avg7.toFixed(0) : avg7.toFixed(1),
        deltaText,
        deltaTone,
      };
    }
    return result;
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
    { key: 'pageViews', label: 'Page Views (30d)', value: totals.pageViews, badge: '' },
    { key: 'treesCreated', label: 'Trees Created (30d)', value: totals.treesCreated, badge: '' },
    { key: 'photosUploaded', label: 'Photos Uploaded (30d)', value: totals.photosUploaded, badge: '' },
    { key: 'relationsSolved', label: 'Relations Solved (30d)', value: totals.relationsSolved, badge: '' },
    { key: 'joinRequests', label: 'Join Requests (30d)', value: totals.joinRequests, badge: '' },
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
        .admin-kpi-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 0.74rem;
          color: var(--muted, #6B7280);
          font-variant-numeric: tabular-nums;
          padding-top: 2px;
        }
        .admin-delta-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          line-height: 1.2;
        }
        .admin-delta-up {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .admin-delta-down {
          background: rgba(185, 28, 59, 0.1);
          color: #9f1239;
        }
        .admin-delta-neutral {
          background: rgba(107, 114, 128, 0.1);
          color: var(--muted, #6B7280);
        }
        .admin-chart-card {
          background: var(--surface, #FFFFFF);
          border: 1px solid var(--line, #E6DFD5);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-chart-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .admin-chart-legend {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 0.78rem;
          color: var(--muted, #6B7280);
        }
        .admin-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .admin-legend-swatch {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          display: inline-block;
        }
        .admin-chart-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .admin-chart-bar-group:hover .admin-chart-hover-bg {
          fill: rgba(27, 36, 50, 0.04);
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
            <h1 className="admin-title">Admin Analytics Panel</h1>
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
              {kpiCards.map((card) => {
                const stats = todayVsAvg[card.key] || {
                  today: 0,
                  avg7Label: '0.0',
                  deltaText: '—',
                  deltaTone: 'neutral',
                };
                return (
                  <div key={card.label} className="admin-kpi-card">
                    <div className="admin-kpi-top">
                      <span>{card.label}</span>
                      <span aria-hidden="true">{card.badge}</span>
                    </div>
                    <div className="admin-kpi-value">{card.value.toLocaleString()}</div>
                    <div className="admin-kpi-meta">
                      <span>
                        Today: <strong>{stats.today.toLocaleString()}</strong> · 7d avg:{' '}
                        {stats.avg7Label}
                      </span>
                      <span
                        className={`admin-delta-badge admin-delta-${stats.deltaTone}`}
                        title={`Today (${stats.today}) vs 7-day daily average (${stats.avg7Label})`}
                      >
                        {stats.deltaText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            {dailyRows.length > 0 && (() => {
              const svgW = 800;
              const svgH = 236;
              const padL = 44;
              const padR = 14;
              const padT = 16;
              const padB = 30;
              const plotW = svgW - padL - padR;
              const plotH = svgH - padT - padB;
              const maxVal = Math.max(
                1,
                ...chartData.map((d) => Math.max(d.pageViews, d.actions))
              );
              const midVal = maxVal >= 2 ? Math.round(maxVal / 2) : null;
              const n = chartData.length;
              const slotW = plotW / n;
              const groupW = Math.min(28, slotW * 0.72);
              const barGap = Math.max(1.5, groupW * 0.12);
              const barW = Math.max(2, (groupW - barGap) / 2);

              const tickIndices = new Set([0, n - 1]);
              if (n > 2 && n <= 7) {
                for (let i = 1; i < n - 1; i += 1) tickIndices.add(i);
              } else if (n > 7) {
                const steps = 4;
                for (let s = 1; s < steps; s += 1) {
                  tickIndices.add(Math.round((s * (n - 1)) / steps));
                }
              }

              return (
                <section className="admin-chart-card" aria-label="30-Day Activity Trend">
                  <div className="admin-chart-head">
                    <strong>30-Day Activity Trend</strong>
                    <div className="admin-chart-legend">
                      <span className="admin-legend-item">
                        <span
                          className="admin-legend-swatch"
                          style={{ background: '#b91c3b' }}
                        />
                        Page Views
                      </span>
                      <span
                        className="admin-legend-item"
                        title="Trees Created + Photos Uploaded + Relations Solved + Join Requests"
                      >
                        <span
                          className="admin-legend-swatch"
                          style={{ background: '#d97706' }}
                        />
                        Actions
                      </span>
                    </div>
                  </div>
                  <svg
                    className="admin-chart-svg"
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    role="img"
                    aria-label="Grouped bar chart of daily page views and actions"
                  >
                    <line
                      x1={padL}
                      y1={padT}
                      x2={svgW - padR}
                      y2={padT}
                      stroke="var(--line, #E6DFD5)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={padT + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="var(--muted, #6B7280)"
                    >
                      {maxVal.toLocaleString()}
                    </text>

                    {midVal !== null && (
                      <>
                        <line
                          x1={padL}
                          y1={padT + plotH / 2}
                          x2={svgW - padR}
                          y2={padT + plotH / 2}
                          stroke="var(--line, #E6DFD5)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 8}
                          y={padT + plotH / 2 + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="var(--muted, #6B7280)"
                        >
                          {midVal.toLocaleString()}
                        </text>
                      </>
                    )}

                    <line
                      x1={padL}
                      y1={padT + plotH}
                      x2={svgW - padR}
                      y2={padT + plotH}
                      stroke="var(--line, #E6DFD5)"
                    />
                    <text
                      x={padL - 8}
                      y={padT + plotH + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="var(--muted, #6B7280)"
                    >
                      0
                    </text>

                    {chartData.map((d, i) => {
                      const slotX = padL + i * slotW;
                      const groupX = slotX + (slotW - groupW) / 2;
                      const pvH =
                        d.pageViews > 0
                          ? Math.max(2, (d.pageViews / maxVal) * plotH)
                          : 0;
                      const actH =
                        d.actions > 0
                          ? Math.max(2, (d.actions / maxVal) * plotH)
                          : 0;
                      const pvY = padT + plotH - pvH;
                      const actY = padT + plotH - actH;
                      const showTick = tickIndices.has(i);
                      const tickAnchor =
                        i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';

                      return (
                        <g key={d.date} className="admin-chart-bar-group">
                          <title>
                            {`${d.date}\nPage Views: ${d.pageViews.toLocaleString()}\nActions: ${d.actions.toLocaleString()} (Trees: ${d.treesCreated}, Photos: ${d.photosUploaded}, Relations: ${d.relationsSolved}, Joins: ${d.joinRequests})`}
                          </title>
                          <rect
                            className="admin-chart-hover-bg"
                            x={slotX}
                            y={padT}
                            width={slotW}
                            height={plotH}
                            fill="transparent"
                            rx="3"
                          />
                          {pvH > 0 && (
                            <rect
                              x={groupX}
                              y={pvY}
                              width={barW}
                              height={pvH}
                              fill="#b91c3b"
                              rx="2"
                            />
                          )}
                          {actH > 0 && (
                            <rect
                              x={groupX + barW + barGap}
                              y={actY}
                              width={barW}
                              height={actH}
                              fill="#d97706"
                              rx="2"
                            />
                          )}
                          {showTick && (
                            <text
                              x={
                                i === 0
                                  ? Math.max(padL, slotX + slotW / 2)
                                  : i === n - 1
                                    ? Math.min(svgW - padR, slotX + slotW / 2)
                                    : slotX + slotW / 2
                              }
                              y={padT + plotH + 18}
                              textAnchor={tickAnchor}
                              fontSize="11"
                              fill="var(--muted, #6B7280)"
                            >
                              {d.date.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </section>
              );
            })()}

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

        <footer className="site-footer">
          <span>VanshVriksha</span>
          <span className="footer-links">
            <a
              href="https://www.linkedin.com/in/arpit-kumar-gupta-0320a4335/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn ↗
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://github.com/arpitkumar81008-cmd"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub (@arpitkumar81008-cmd) ↗
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://github.com/arpitkumar81008-cmd/family-tree"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source Repository ↗
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
