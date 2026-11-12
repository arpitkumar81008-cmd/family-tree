import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'motion';

function isMobileCarouselActive() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const vp = document.documentElement.getAttribute('data-viewport');
  if (vp === 'mobile') return true;
  if (vp === 'laptop') return false;
  return window.innerWidth <= 768;
}

function isMotionReduced() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  return (
    document.documentElement.getAttribute('data-motion') === 'reduce' ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  );
}

function useMobileCarousel(slideCount, dotCount = 4) {
  const trackRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  const activeDot =
    slideCount <= 1
      ? 0
      : Math.min(dotCount - 1, Math.round((activeSlide / (slideCount - 1)) * (dotCount - 1)));

  const scrollToSlide = useCallback(
    index => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(slideCount - 1, index));
      const slides = track.children;
      const target = slides[clamped];
      if (!target) return;
      const left = target.offsetLeft - track.offsetLeft;
      if (typeof track.scrollTo === 'function') {
        track.scrollTo({ left, behavior: isMotionReduced() ? 'auto' : 'smooth' });
      } else {
        track.scrollLeft = left;
      }
      setActiveSlide(clamped);
    },
    [slideCount]
  );

  const handleDotClick = useCallback(
    dotIndex => {
      pausedRef.current = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      const targetSlide =
        slideCount <= dotCount
          ? dotIndex
          : Math.round((dotIndex / (dotCount - 1)) * (slideCount - 1));
      scrollToSlide(targetSlide);
      resumeTimerRef.current = setTimeout(() => {
        pausedRef.current = false;
      }, 5000);
    },
    [dotCount, scrollToSlide, slideCount]
  );

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const scrollLeft = track.scrollLeft;
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const child = track.children[i];
      if (child.offsetParent === null) continue;
      const dist = Math.abs(child.offsetLeft - track.offsetLeft - scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    setActiveSlide(closestIdx);
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const resumeDelayed = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 4000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = setInterval(() => {
      if (pausedRef.current || !isMobileCarouselActive() || isMotionReduced()) return;
      setActiveSlide(prev => {
        const next = (prev + 1) % slideCount;
        const track = trackRef.current;
        if (track && track.children[next]) {
          const left = track.children[next].offsetLeft - track.offsetLeft;
          if (typeof track.scrollTo === 'function') {
            track.scrollTo({ left, behavior: 'smooth' });
          } else {
            track.scrollLeft = left;
          }
        }
        return next;
      });
    }, 3800);

    return () => {
      clearInterval(timer);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [slideCount]);

  return {
    trackRef,
    activeDot,
    handleDotClick,
    handleScroll,
    pause,
    resumeDelayed
  };
}

export function LandingPage({
  t,
  lang = 'en',
  hasPrivateTree = false,
  memberCount,
  generationCount,
  branchCount,
  onExplore,
  onCreate,
  onNavigateMyTree
}) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const res = t(key);
    return !res || res === key ? fallback : res;
  };
  const rootRef = useRef(null);
  const featuresCarousel = useMobileCarousel(5, 4);
  const tutorialsCarousel = useMobileCarousel(4, 4);

  const renderSpotlightDiagram = () => (
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
  );

  const spotlightCtaAction = hasPrivateTree ? (onNavigateMyTree || onCreate) : onExplore;
  const spotlightCtaLabel = hasPrivateTree
    ? tr('navMyTree', lang === 'hi' ? 'मेरा निजी वृक्ष' : 'My Private Tree')
    : t('spotlightCta');

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const isReduced =
      document.documentElement.getAttribute('data-motion') === 'reduce' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (!isReduced) {
      const heroNodes = el.querySelectorAll('.hero .eyebrow, .hero .hero-title, .hero .hero-cta');
      if (heroNodes.length) {
        animate(
          heroNodes,
          { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] },
          { delay: stagger(0.06), duration: 0.42, easing: [0.22, 1, 0.36, 1] }
        );
      }

      const metricNodes = el.querySelectorAll('.metric');
      if (metricNodes.length) {
        animate(
          metricNodes,
          { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] },
          { delay: stagger(0.05, { start: 0.1 }), duration: 0.38, easing: [0.22, 1, 0.36, 1] }
        );
      }
    }

    if (typeof IntersectionObserver === 'undefined') return;
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
    {
      num: '01',
      title: 'feat1Title',
      body: 'feat1Body',
      accent: 'lineage',
      image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Banyan_tree_2024.jpg/960px-Banyan_tree_2024.jpg',
      fallbackLabel: lang === 'hi' ? 'वंश वृक्ष' : 'Lineage Views'
    },
    {
      num: '02',
      title: 'feat2Title',
      body: 'feat2Body',
      accent: 'kinship',
      image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Decoration_of_oil_lamp_%28Matti%27r_Saki%29_during_Diwali.jpg/960px-Decoration_of_oil_lamp_%28Matti%27r_Saki%29_during_Diwali.jpg',
      fallbackLabel: lang === 'hi' ? 'रिश्ते' : 'Indian Kinship'
    },
    {
      num: '03',
      title: 'feat3Title',
      body: 'feat3Body',
      accent: 'script',
      image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/1674_CE_Prayag_Snana_Vidhi%2C_Puranas_manuscript%2C_Sanskrit%2C_Devanagari_sample_i.jpg/960px-1674_CE_Prayag_Snana_Vidhi%2C_Puranas_manuscript%2C_Sanskrit%2C_Devanagari_sample_i.jpg',
      fallbackLabel: lang === 'hi' ? 'देवनागरी' : 'EN → हिं'
    },
    {
      num: '04',
      title: 'feat4Title',
      body: 'feat4Body',
      accent: 'archive',
      image: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Group_vintage_photograph_of_a_Brahmin_family_in_India_%28c._1880%29.jpg',
      fallbackLabel: lang === 'hi' ? 'निजी संग्रह' : 'Private Archive'
    }
  ];
  const spotlightFeatureImage =
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Family_Tree_of_the_Dahis_and_Ghabra_leaders.jpg/960px-Family_Tree_of_the_Dahis_and_Ghabra_leaders.jpg';
  const tutorials = [
    ['tut1Step', 'tut1Title', 'tut1Body'],
    ['tut2Step', 'tut2Title', 'tut2Body'],
    ['tut3Step', 'tut3Title', 'tut3Body'],
    ['tut4Step', 'tut4Title', 'tut4Body']
  ];
  const faqs = [
    ['faq1Q', 'faq1A'],
    ['faq2Q', 'faq2A'],
    ['faq3Q', 'faq3A'],
    ['faq4Q', 'faq4A']
  ];

  return (
    <div className="landing" ref={rootRef}>
      <section className="hero reveal-parent" tabIndex={0}>
        <p className="eyebrow">{t('landEyebrow')}</p>
        <h1 className="hero-title">{t('landTitle')}</h1>
        <p className="hero-lede hover-explanation">{t('landLede')}</p>
        <div className="hero-cta">
          {hasPrivateTree ? (
            <button
              type="button"
              className="btn btn-lg land-cta-primary"
              onClick={onNavigateMyTree || onCreate}
            >
              🌳 {tr('navMyTree', lang === 'hi' ? 'मेरा निजी वृक्ष' : 'My Private Tree')} →
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-lg land-cta-primary" onClick={onExplore}>
                {t('landCtaExplore')}
              </button>
              <button type="button" className="btn ghost btn-lg land-cta-create" onClick={onCreate}>
                ✨ {tr('navCreatePrivateCta', lang === 'hi' ? 'अपना निजी वृक्ष बनाएं' : 'Create Your Private Tree')}
              </button>
            </>
          )}
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
        <div
          className="feature-grid mobile-carousel-track"
          ref={featuresCarousel.trackRef}
          onScroll={featuresCarousel.handleScroll}
          onTouchStart={featuresCarousel.pause}
          onTouchEnd={featuresCarousel.resumeDelayed}
          onPointerDown={featuresCarousel.pause}
          onPointerUp={featuresCarousel.resumeDelayed}
          onMouseEnter={featuresCarousel.pause}
          onMouseLeave={featuresCarousel.resumeDelayed}
          onFocus={featuresCarousel.pause}
          onBlur={featuresCarousel.resumeDelayed}
        >
          {features.map(({ num, title, body, accent, image, fallbackLabel }) => (
            <article className={`feature-card feature-card--visual feature-card--${accent} mobile-carousel-slide reveal-parent reveal-on-scroll`} key={num} tabIndex={0}>
              <div className="feature-media">
                <div className="feature-media-fallback" aria-hidden="true">
                  <svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60 10C44 10 34 22 34 38V62H86V38C86 22 76 10 60 10Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45"/>
                    <circle cx="60" cy="28" r="7" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                    <path d="M40 54C46 44 74 44 80 54" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45"/>
                  </svg>
                  <span>{fallbackLabel}</span>
                </div>
                <img
                  className="feature-media-img"
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="feature-media-scrim" aria-hidden="true" />
                <span className="feature-num" aria-hidden="true">{num}</span>
                <span className="feature-media-tag" aria-hidden="true">{fallbackLabel}</span>
              </div>
              <div className="feature-body">
                <h3>{t(title)}</h3>
                <p className="hover-explanation">{t(body)}</p>
              </div>
            </article>
          ))}
          <article className="feature-card feature-card--visual feature-card--spatial mobile-carousel-slide spotlight-mobile-slide reveal-parent reveal-on-scroll" tabIndex={0}>
            <div className="feature-media">
              <div className="feature-media-fallback" aria-hidden="true">
                <svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="44" y="10" width="32" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                  <path d="M60 24V38M60 38H34V48M60 38H86V48" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5"/>
                  <rect x="20" y="48" width="28" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                  <rect x="72" y="48" width="28" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                </svg>
                <span>{lang === 'hi' ? 'द्वि-मोड इंजन' : 'Spatial Engine'}</span>
              </div>
              <img
                className="feature-media-img"
                src={spotlightFeatureImage}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="feature-media-scrim" aria-hidden="true" />
              <span className="feature-num" aria-hidden="true">05</span>
              <span className="feature-media-tag" aria-hidden="true">{lang === 'hi' ? 'द्वि-मोड इंजन' : 'Spatial Engine'}</span>
            </div>
            <div className="feature-body">
              {renderSpotlightDiagram()}
              <div className="spotlight-text">
                <p className="eyebrow">{t('spotlightEyebrow')}</p>
                <h3>{t('spotlightTitle')}</h3>
                <p className="hover-explanation">{t('spotlightBody')}</p>
                <button type="button" className="btn ghost btn-sm" onClick={spotlightCtaAction}>
                  {spotlightCtaLabel}
                </button>
              </div>
            </div>
          </article>
        </div>
        <div className="carousel-dots" role="tablist" aria-label={t('featuresTitle')}>
          {[0, 1, 2, 3].map(dotIdx => (
            <button
              key={dotIdx}
              type="button"
              role="tab"
              aria-selected={featuresCarousel.activeDot === dotIdx}
              aria-label={`Slide ${dotIdx + 1}`}
              className={`carousel-dot${featuresCarousel.activeDot === dotIdx ? ' is-active' : ''}`}
              onClick={() => featuresCarousel.handleDotClick(dotIdx)}
            />
          ))}
        </div>
      </section>

      <section className="spotlight spotlight-desktop reveal-parent reveal-on-scroll" tabIndex={0}>
        {renderSpotlightDiagram()}
        <div className="spotlight-text">
          <p className="eyebrow">{t('spotlightEyebrow')}</p>
          <h2 className="section-title">{t('spotlightTitle')}</h2>
          <p className="hover-explanation">{t('spotlightBody')}</p>
          <button type="button" className="btn ghost" onClick={spotlightCtaAction}>
            {spotlightCtaLabel}
          </button>
        </div>
      </section>

      {/* Quick Start Tutorials Section */}
      <section className="tutorials-section">
        <h2 className="section-title">{t('tutorialsTitle')}</h2>
        <div
          className="feature-grid mobile-carousel-track"
          ref={tutorialsCarousel.trackRef}
          onScroll={tutorialsCarousel.handleScroll}
          onTouchStart={tutorialsCarousel.pause}
          onTouchEnd={tutorialsCarousel.resumeDelayed}
          onPointerDown={tutorialsCarousel.pause}
          onPointerUp={tutorialsCarousel.resumeDelayed}
          onMouseEnter={tutorialsCarousel.pause}
          onMouseLeave={tutorialsCarousel.resumeDelayed}
          onFocus={tutorialsCarousel.pause}
          onBlur={tutorialsCarousel.resumeDelayed}
        >
          {tutorials.map(([stepKey, titleKey, bodyKey]) => (
            <article className="feature-card mobile-carousel-slide reveal-parent reveal-on-scroll" key={stepKey} tabIndex={0}>
              <span className="feature-num" aria-hidden="true">{t(stepKey)}</span>
              <h3>{t(titleKey)}</h3>
              <p className="hover-explanation">{t(bodyKey)}</p>
            </article>
          ))}
        </div>
        <div className="carousel-dots" role="tablist" aria-label={t('tutorialsTitle')}>
          {[0, 1, 2, 3].map(dotIdx => (
            <button
              key={dotIdx}
              type="button"
              role="tab"
              aria-selected={tutorialsCarousel.activeDot === dotIdx}
              aria-label={`Tutorial ${dotIdx + 1}`}
              className={`carousel-dot${tutorialsCarousel.activeDot === dotIdx ? ' is-active' : ''}`}
              onClick={() => tutorialsCarousel.handleDotClick(dotIdx)}
            />
          ))}
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

      {/* Frequently Asked Questions (FAQ) Section — at the end, only appears when clicked */}
      <section className="faq-section" aria-label={t('faqTitle')}>
        <details className="faq-disclosure">
          <summary className="faq-disclosure-trigger">
            <span>{t('faqTitle')}</span>
            <span className="faq-toggle-pill" aria-hidden="true">FAQ</span>
          </summary>
          <div className="faq-grid">
            {faqs.map(([qKey, aKey]) => (
              <details className="faq-card" key={qKey}>
                <summary className="faq-question">{t(qKey)}</summary>
                <p className="faq-answer">{t(aKey)}</p>
              </details>
            ))}
          </div>
        </details>
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
