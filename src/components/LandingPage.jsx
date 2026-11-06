import React from 'react';

export function LandingPage({
  t,
  memberCount,
  generationCount,
  branchCount,
  onExplore,
  onCreate
}) {
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
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">{t('landEyebrow')}</p>
        <h1 className="hero-title">{t('landTitle')}</h1>
        <p className="hero-lede">{t('landLede')}</p>
        <div className="hero-cta">
          <button type="button" className="btn btn-lg" onClick={onExplore}>
            {t('landCtaExplore')}
          </button>
          <button type="button" className="btn ghost btn-lg" onClick={onCreate}>
            {t('landCtaCreate')}
          </button>
        </div>
      </section>

      <section className="metrics" aria-label="Lineage statistics">
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
            <article className="feature-card" key={num}>
              <span className="feature-num" aria-hidden="true">{num}</span>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="spotlight">
        <div className="spotlight-pair" aria-hidden="true">
          <span className="spot-card">BP</span>
          <span className="spot-link" />
          <span className="spot-card">HD</span>
        </div>
        <div className="spotlight-text">
          <p className="eyebrow">{t('spotlightEyebrow')}</p>
          <h2 className="section-title">{t('spotlightTitle')}</h2>
          <p>{t('spotlightBody')}</p>
          <button type="button" className="btn ghost" onClick={onExplore}>
            {t('spotlightCta')}
          </button>
        </div>
      </section>

      <section className="builder-banner">
        <div>
          <h2 className="section-title">{t('builderTitle')}</h2>
          <p>{t('builderBody')}</p>
        </div>
        <button type="button" className="btn" onClick={onCreate}>
          {t('landCtaCreate')}
        </button>
      </section>
    </div>
  );
}

export default LandingPage;
