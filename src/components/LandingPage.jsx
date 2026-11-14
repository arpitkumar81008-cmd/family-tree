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
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const featuresCarousel = useMobileCarousel(4, 4);
  const tutorialsCarousel = useMobileCarousel(4, 4);

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
      const heroNodes = el.querySelectorAll('.hero .eyebrow, .hero .hero-title, .hero .hero-lede, .hero .hero-cta');
      if (heroNodes.length) {
        animate(
          heroNodes,
          { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] },
          { delay: stagger(0.06), duration: 0.42, easing: [0.22, 1, 0.36, 1] }
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

  const features = [
    {
      num: '01',
      image: '/images/features/feat-lineage.jpg',
      alt: lang === 'hi' ? 'स्पष्ट पारिवारिक वंश वृक्ष चित्रण' : 'Family tree lineage diagram illustration',
      tag: lang === 'hi' ? 'वंश वृक्ष' : 'Family Tree',
      title: t('feat1Title'),
      body: t('feat1Body')
    },
    {
      num: '02',
      image: '/images/features/feat-kinship.jpg',
      alt: lang === 'hi' ? 'भारतीय रिश्ते और पारिवारिक जुड़ाव चित्रण' : 'Indian kinship bond medallions illustration',
      tag: lang === 'hi' ? 'रिश्ता खोजक' : 'Relations',
      title: t('feat2Title'),
      body: t('feat2Body')
    },
    {
      num: '03',
      image: '/images/features/feat-bilingual.jpg',
      alt: lang === 'hi' ? 'अंग्रेज़ी और देवनागरी द्विभाषी लेखन चित्रण' : 'Bilingual English and Devanagari calligraphy illustration',
      tag: lang === 'hi' ? 'द्विभाषी' : 'EN · HI',
      title: t('feat3Title'),
      body: t('feat3Body')
    },
    {
      num: '04',
      image: '/images/features/feat-vault.jpg',
      alt: lang === 'hi' ? 'निजी और सुरक्षित पारिवारिक तिजोरी चित्रण' : 'Private heirloom family archive vault illustration',
      tag: lang === 'hi' ? 'निजी साझाकरण' : 'Private Share',
      title: t('feat4Title'),
      body: t('feat4Body')
    }
  ];

  const featureTabs = lang === 'hi'
    ? [
        {
          id: 'canvas',
          label: 'कैनवास',
          items: [
            { title: 'पारिवारिक शाखाएँ', desc: 'मुख्य व ससुराल शाखाओं पर तुरंत ध्यान दें' },
            { title: 'पिंच और फुल स्क्रीन', desc: 'ज़ूम नियंत्रण और पूरा स्क्रीन दृश्य' },
            { title: 'लैपटॉप और मोबाइल', desc: 'किसी भी स्क्रीन के लिए उपयुक्त लेआउट' },
            { title: 'स्पष्ट वंशावली रेखाएँ', desc: 'बिना किसी ओवरलैप के पीढ़ियों का जुड़ाव' }
          ]
        },
        {
          id: 'kinship',
          label: 'रिश्ते व खोज',
          items: [
            { title: '40+ भारतीय रिश्ते', desc: 'चाचा, बुआ, मामा, मौसी सहित सटीक नाम' },
            { title: 'रिश्ता मार्ग', desc: 'किन्हीं दो सदस्यों का सीधा संबंध देखें' },
            { title: 'दृष्टिकोण बदलें', desc: 'किसी भी व्यक्ति के नजरिये से वृक्ष देखें' },
            { title: 'त्वरित नाम खोज', desc: 'मिलते-जुलते नामों के बीच तुरंत जाएँ' }
          ]
        },
        {
          id: 'bilingual',
          label: 'द्विभाषी व यादें',
          items: [
            { title: 'अंग्रेज़ी और हिन्दी', desc: 'लिखते ही स्वतः हिन्दी नाम तैयार' },
            { title: 'फ़ोटो और HEIC', desc: 'स्वतः संपीड़न के साथ सदस्य फ़ोटो जोड़ें' },
            { title: 'जन्मदिन व मील के पत्थर', desc: 'आने वाले जन्मदिन और आयु विवरण' },
            { title: 'नोट्स और स्मृतियाँ', desc: 'पैतृक स्थान, यादें और स्व. चिह्न' }
          ]
        },
        {
          id: 'share',
          label: 'निजी व बैकअप',
          items: [
            { title: 'क्लाउड सिंक', desc: 'Google या ईमेल से सुरक्षित निजी वृक्ष' },
            { title: 'पारिवारिक कोड', desc: 'एक्सेस कोड व अनुमति से रिश्तेदार जोड़ें' },
            { title: 'PNG व PDF पोस्टर', desc: 'प्रिंट करने योग्य वंश पोस्टर डाउनलोड करें' },
            { title: 'Undo और JSON बैकअप', desc: 'बदलाव पूर्ववत करें व बैकअप सहेजें' }
          ]
        }
      ]
    : [
        {
          id: 'canvas',
          label: 'Tree & Canvas',
          items: [
            { title: 'Family Branches', desc: 'Filter main or in-law branches anytime' },
            { title: 'Pinch & Full Screen', desc: 'Smooth zoom controls & full-screen canvas' },
            { title: 'Laptop & Mobile Views', desc: 'Switch display modes cleanly on any device' },
            { title: 'Zero-Overlap Lines', desc: 'Clear generations and couple connectors' }
          ]
        },
        {
          id: 'kinship',
          label: 'Kinship & Search',
          items: [
            { title: '40+ Indian Relations', desc: 'Chacha, Bua, Mama, Mausi, Jethani & more' },
            { title: 'Relation Path', desc: 'Trace exact connections between any two people' },
            { title: 'See Relations From', desc: 'View the lineage from anyone\'s perspective' },
            { title: 'Instant Search', desc: 'Find and cycle through matching relatives' }
          ]
        },
        {
          id: 'bilingual',
          label: 'Bilingual & Photos',
          items: [
            { title: 'English & Hindi', desc: 'Auto Devanagari transliteration as you type' },
            { title: 'Photos & HEIC', desc: 'Upload portraits with automatic compression' },
            { title: 'Birthdays & Milestones', desc: 'Upcoming family birthdays and age tracker' },
            { title: 'Notes & Legacy', desc: 'Hometowns, memories & late-ancestor tags' }
          ]
        },
        {
          id: 'share',
          label: 'Private & Export',
          items: [
            { title: 'Private Cloud Sync', desc: 'Sign in with Google or email to sync safely' },
            { title: 'Family Access Code', desc: 'Invite relatives by code or join requests' },
            { title: 'PNG & PDF Posters', desc: 'Download high-res images or print posters' },
            { title: 'Undo & JSON Backup', desc: 'Step backward/forward or export a backup' }
          ]
        }
      ];

  const activeTabObj = featureTabs[activeFeatureTab] || featureTabs[0];

  const tutorials = [
    ['tut1Step', 'tut1Title', 'tut1Body'],
    ['tut2Step', 'tut2Title', 'tut2Body'],
    ['tut3Step', 'tut3Title', 'tut3Body'],
    ['tut4Step', 'tut4Title', 'tut4Body']
  ];

  return (
    <div className="landing" ref={rootRef}>
      <section className="hero reveal-parent" tabIndex={0}>
        <p className="eyebrow">{t('landEyebrow')}</p>
        <h1 className="hero-title">{t('landTitle')}</h1>
        <p className="hero-lede">{t('landLede')}</p>
        <div className="hero-cta">
          {hasPrivateTree ? (
            <>
              <button
                type="button"
                className="btn btn-lg land-cta-primary"
                onClick={onNavigateMyTree || onCreate}
              >
                {tr('navMyTree', lang === 'hi' ? 'मेरा निजी वृक्ष' : 'My Private Tree')} →
              </button>
              <a
                href="#quick-start-tutorials"
                className="btn ghost btn-lg land-cta-tutorial"
                onClick={handleScrollToTutorials}
              >
                {tr('quickStartCta', lang === 'hi' ? 'त्वरित उपयोग गाइड' : 'Quick Start Tutorial')} ↓
              </a>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-lg land-cta-primary" onClick={onExplore}>
                {t('landCtaExplore')}
              </button>
              <button type="button" className="btn ghost btn-lg land-cta-create" onClick={onCreate}>
                {tr('navCreatePrivateCta', lang === 'hi' ? 'अपना वृक्ष बनाएँ' : 'Build your own tree')}
              </button>
              <a
                href="#quick-start-tutorials"
                className="btn ghost btn-lg land-cta-tutorial"
                onClick={handleScrollToTutorials}
              >
                {tr('quickStartCta', lang === 'hi' ? 'त्वरित उपयोग गाइड' : 'Quick Start Tutorial')} ↓
              </a>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <div className="features-header">
          <h2 className="section-title">{t('featuresTitle')}</h2>
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
        <div className="features-tabs-box">
          <div
            className="features-tablist"
            role="tablist"
            aria-label={lang === 'hi' ? 'मुख्य सुविधाएँ' : 'Platform features'}
          >
            {featureTabs.map((tab, idx) => {
              const isSelected = activeFeatureTab === idx;
              return (
                <button
                  key={tab.id}
                  id={`feature-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`feature-panel-${tab.id}`}
                  className={`features-tab-btn${isSelected ? ' is-active' : ''}`}
                  onClick={() => setActiveFeatureTab(idx)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div
            id={`feature-panel-${activeTabObj.id}`}
            role="tabpanel"
            aria-labelledby={`feature-tab-${activeTabObj.id}`}
            className="features-tabpanel"
          >
            <div className="features-tab-grid">
              {activeTabObj.items.map(item => (
                <div className="features-tab-item" key={item.title}>
                  <div className="fti-head">
                    <h3>{item.title}</h3>
                  </div>
                  <p className="fti-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="tutorials-section" id="quick-start-tutorials">
        <h2 className="section-title">{t('tutorialsTitle')}</h2>
        <div
          className="feature-grid tutorials-grid mobile-carousel-track"
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
            <article
              className="feature-card tutorial-step-card mobile-carousel-slide reveal-parent reveal-on-scroll"
              key={stepKey}
              tabIndex={0}
            >
              <span className="feature-num" aria-hidden="true">{t(stepKey)}</span>
              <h3>{t(titleKey)}</h3>
              <p className="fac-desc">{t(bodyKey)}</p>
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

      <footer className="site-footer">
        <span>{t('foot')}</span>
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
  );
}

export default LandingPage;
