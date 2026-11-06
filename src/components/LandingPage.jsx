import React, { useEffect, useRef } from 'react';

export function LandingPage({
  t,
  memberCount,
  generationCount,
  branchCount,
  onExplore,
  onCreate
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const targets = el.querySelectorAll('.reveal-on-scroll');
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -10% 0px' }
    );
    targets.forEach(node => io.observe(node));
    return () => io.disconnect();
  }, []);

  const metrics = [
    [memberCount, 'metricMembers'],
    [generationCount, 'metricGens'],
    [branchCount, 'metricBranches'],
    ['100%', 'metricOffline']
  ];
  const features = [
    ['01', 'feat1Title', 'feat1Body'],
    ['02', 'feat2Title', 'feat2Body'],
    ['03', 'feat3Title', 'feat3Body'],
    ['04', 'feat4Title', 'feat4Body']
  ];

  return (
    <div className="landing" ref={rootRef}>
      <section className="hero reveal-parent" tabIndex={0}>
        <p className="eyebrow">{t('landEyebrow')}</p>
        <h1 className="hero-title">{t('landTitle')}</h1>
        <p className="hero-lede hover-explanation">{t('landLede')}</p>
        <div className="hero-cta">
          <button type="button" className="btn btn-lg" onClick={onExplore}>
            {t('landCtaExplore')}
          </button>
          <button type="button" className="btn ghost btn-lg" onClick={onCreate}>
            {t('landCtaCreate')}
          </button>
        </div>
      </section>

      <section className="metrics" aria-label="Platform capabilities">
        {metrics.map(([value, key]) => (
          <div className="metric" key={key}>
            <span className="metric-value">{value}</span>
            <span className="metric-label">{t(key)}</span>
          </div>
        ))}
      </section>

      <section className="features">
        <h2 className="section-title">{t('featuresTitle')}</h2>
        <div className="feature-grid">
          {features.map(([num, title, body]) => (
            <article className="feature-card reveal-parent reveal-on-scroll" key={num} tabIndex={0}>
              <span className="feature-num" aria-hidden="true">{num}</span>
              <h3>{t(title)}</h3>
              <p className="hover-explanation">{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="spotlight reveal-parent reveal-on-scroll" tabIndex={0}>
        <div className="spotlight-diagram" aria-hidden="true">
          <div className="spot-row">
            <span className="spot-node">Gen 1</span>
            <span className="spot-link" />
            <span className="spot-node">Spouse</span>
          </div>
          <div className="spot-drop" />
          <div className="spot-row">
            <span className="spot-node sub">Branch A</span>
            <span className="spot-node sub">Branch B</span>
          </div>
        </div>
        <div className="spotlight-text">
          <p className="eyebrow">{t('spotlightEyebrow')}</p>
          <h2 className="section-title">{t('spotlightTitle')}</h2>
          <p className="hover-explanation">{t('spotlightBody')}</p>
          <button type="button" className="btn ghost" onClick={onExplore}>
            {t('spotlightCta')}
          </button>
        </div>
      </section>

      <section
        className="builder-banner clickable-banner reveal-parent"
        role="button"
        tabIndex={0}
        aria-label={t('builderTitle')}
        onClick={onCreate}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCreate();
          }
        }}
      >
        <div className="builder-banner-copy">
          <h2 className="section-title">{t('builderTitle')}</h2>
          <p className="hover-explanation">{t('builderBody')}</p>
        </div>
        <span className="btn builder-cta-pill" aria-hidden="true">
          {t('landCtaCreate')} →
        </span>
      </section>

      <footer className="site-footer">
        <span>{t('foot')}</span>
        <span className="footer-links">
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
  );
}

export default LandingPage;
