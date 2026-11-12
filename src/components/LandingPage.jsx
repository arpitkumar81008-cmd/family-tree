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
  const activeSlideRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

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
      activeSlideRef.current = clamped;
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
    activeSlideRef.current = closestIdx;
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
      const next = (activeSlideRef.current + 1) % slideCount;
      activeSlideRef.current = next;
      setActiveSlide(next);
      const track = trackRef.current;
      if (track && track.children[next]) {
        const left = track.children[next].offsetLeft - track.offsetLeft;
        if (typeof track.scrollTo === 'function') {
          track.scrollTo({ left, behavior: 'smooth' });
        } else {
          track.scrollLeft = left;
        }
      }
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

  const handleScrollToTutorials = useCallback(e => {
    if (e) e.preventDefault();
    const target = document.getElementById('quick-start-tutorials');
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: isMotionReduced() ? 'auto' : 'smooth', block: 'start' });
    }
  }, []);

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
      image: '/images/features/feat-lineage.jpg',
      alt: lang === 'hi' ? 'द्वि-अक्षीय वंशावली वृक्ष चित्रण' : 'Dual-axis Indian family lineage diagram illustration',
      tag: lang === 'hi' ? 'द्वि-अक्षीय दृश्य' : 'Dual-Axis Layout',
      title: t('feat1Title'),
      body: lang === 'hi'
        ? 'पूरे वंश का ऊपर से नीचे का दृश्य, या किसी भी व्यक्ति के केंद्र से दिशात्मक फ़्लोचार्ट — बिना एक भी रेखा टकराए।'
        : 'Switch seamlessly between a top-down lineage overview and a person-centric directional flowchart with zero overlapping lines.'
    },
    {
      num: '02',
      image: '/images/features/feat-kinship.jpg',
      alt: lang === 'hi' ? 'भारतीय रिश्ते और पारिवारिक जुड़ाव चित्रण' : 'Indian kinship bond medallions illustration',
      tag: lang === 'hi' ? 'भारतीय रिश्ते इंजन' : 'Indian Kinship AI',
      title: t('feat2Title'),
      body: lang === 'hi'
        ? 'ताऊजी, चाचाजी, बुआजी, मौसीजी, मामाजी और जेठानी जैसे 40+ प्रामाणिक रिश्ते किन्हीं भी दो सदस्यों के बीच स्वतः गणना।'
        : 'Automatically resolves 40+ authentic paternal, maternal, and in-law relations—Tauji, Bua, Mama, Mausi, Jethani—between any two people.'
    },
    {
      num: '03',
      image: '/images/features/feat-bilingual.jpg',
      alt: lang === 'hi' ? 'अंग्रेज़ी और देवनागरी द्विभाषी लेखन चित्रण' : 'Bilingual English and Devanagari calligraphy illustration',
      tag: lang === 'hi' ? 'द्विभाषी संग्रह' : 'Bilingual Archive',
      title: t('feat3Title'),
      body: lang === 'hi'
        ? 'अंग्रेज़ी में नाम टाइप करते ही देवनागरी वर्तनी तुरंत तैयार — ऑनलाइन हो या पूरी तरह ऑफ़लाइन।'
        : 'Type any name in English and generate accurate Devanagari script instantaneously—working smoothly online or completely offline.'
    },
    {
      num: '04',
      image: '/images/features/feat-vault.jpg',
      alt: lang === 'hi' ? 'निजी और सुरक्षित पारिवारिक तिजोरी चित्रण' : 'Private heirloom family archive vault illustration',
      tag: lang === 'hi' ? 'निजी तिजोरी' : 'Private Vault',
      title: t('feat4Title'),
      body: lang === 'hi'
        ? 'ब्राउज़र में निजी रखें या टोकन-सुरक्षित क्लाउड लिंक साझा करें। एक क्लिक में पूरा JSON बैकअप डाउनलोड करें।'
        : 'Keep your family tree private in-browser or share via a token-protected link. Export a portable JSON backup anytime.'
    }
  ];
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
            <>
              <button
                type="button"
                className="btn btn-lg land-cta-primary"
                onClick={onNavigateMyTree || onCreate}
              >
                🌳 {tr('navMyTree', lang === 'hi' ? 'मेरा निजी वृक्ष' : 'My Private Tree')} →
              </button>
              <a
                href="#quick-start-tutorials"
                className="btn ghost btn-lg land-cta-tutorial"
                onClick={handleScrollToTutorials}
              >
                📖 {tr('quickStartCta', lang === 'hi' ? 'त्वरित उपयोग गाइड' : 'Quick Start Tutorial')} ↓
              </a>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-lg land-cta-primary" onClick={onExplore}>
                {t('landCtaExplore')}
              </button>
              <button type="button" className="btn ghost btn-lg land-cta-create" onClick={onCreate}>
                ✨ {tr('navCreatePrivateCta', lang === 'hi' ? 'अपना निजी वृक्ष बनाएं' : 'Create Your Private Tree')}
              </button>
              <a
                href="#quick-start-tutorials"
                className="btn ghost btn-lg land-cta-tutorial"
                onClick={handleScrollToTutorials}
              >
                📖 {tr('quickStartCta', lang === 'hi' ? 'त्वरित उपयोग गाइड' : 'Quick Start Tutorial')} ↓
              </a>
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
        <div className="features-header">
          <p className="eyebrow">
            {lang === 'hi' ? 'मंच की विशिष्टता' : 'WHY VANSHVRIKSHA'}
          </p>
          <h2 className="section-title">{t('featuresTitle')}</h2>
          <p className="features-subtitle">
            {lang === 'hi'
              ? 'भारतीय पारिवारिक संरचना, द्विभाषी नामकरण और पूर्ण गोपनीयता के लिए निर्मित आधुनिक वंशावली अनुभव।'
              : 'Purpose-built for Indian lineages—combining dual-axis diagrams, authentic kinship logic, and private-by-default ownership.'}
          </p>
        </div>
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
          {features.map(({ num, image, alt, tag, title, body }) => (
            <article
              className="feature-card feature-art-card mobile-carousel-slide reveal-parent reveal-on-scroll"
              key={num}
              tabIndex={0}
            >
              <div className="fac-media">
                <img src={image} alt={alt} loading="lazy" decoding="async" />
                <span className="fac-index feature-num" aria-hidden="true">{num}</span>
                <span className="fac-tag">{tag}</span>
              </div>
              <div className="fac-body">
                <h3>{title}</h3>
                <p className="fac-desc">{body}</p>
              </div>
            </article>
          ))}
          <article
            className="feature-card feature-art-card mobile-carousel-slide spotlight-mobile-slide reveal-parent reveal-on-scroll"
            tabIndex={0}
          >
            <div className="fac-media">
              <img
                src="/images/features/feat-spatial.jpg"
                alt={lang === 'hi' ? 'स्थानिक वंशावली कैनवास चित्रण' : 'Interactive spatial family tree canvas illustration'}
                loading="lazy"
                decoding="async"
              />
              <span className="fac-index feature-num" aria-hidden="true">05</span>
              <span className="fac-tag">{lang === 'hi' ? 'स्थानिक नेविगेटर' : 'Spatial Navigator'}</span>
            </div>
            <div className="fac-body spotlight-text">
              <h3>{t('spotlightTitle')}</h3>
              <p className="fac-desc">{t('spotlightBody')}</p>
              <button type="button" className="btn ghost btn-sm fac-cta" onClick={spotlightCtaAction}>
                {spotlightCtaLabel}
              </button>
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
        <div className="spotlight-desktop-media">
          <img
            src="/images/features/feat-spatial.jpg"
            alt={lang === 'hi' ? 'स्थानिक वंशावली कैनवास चित्रण' : 'Interactive spatial family tree canvas illustration'}
            loading="lazy"
            decoding="async"
          />
          <div className="spotlight-media-overlay">
            <span className="spotlight-overlay-badge">
              {lang === 'hi' ? 'स्थानिक इंजन' : 'SPATIAL ENGINE'}
            </span>
            <p className="spotlight-overlay-caption">
              {lang === 'hi'
                ? 'द्वि-अक्षीय वंशावली और व्यक्ति-केंद्रित फ़्लोचार्ट'
                : 'Vertical Lineage · Person-Centric Flowchart'}
            </p>
          </div>
        </div>
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
      <section className="tutorials-section" id="quick-start-tutorials">
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
