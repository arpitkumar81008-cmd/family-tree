import React, { useEffect, useState } from 'react';

const ONBOARD_KEY = 'gupta_onboard_steps_v2';

function loadDismissedSteps() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(localStorage.getItem(ONBOARD_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveDismissedSteps(map) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(ONBOARD_KEY, JSON.stringify(map));
  } catch {}
}

export function OnboardingToast({
  currentView,
  activeTab,
  lang,
  onOpenHelpModal
}) {
  const [dismissed, setDismissed] = useState(loadDismissedSteps);
  const [visibleStep, setVisibleStep] = useState(null);

  const stepKey =
    currentView === 'home'
      ? 'home'
      : activeTab === 'backup'
      ? 'backup'
      : 'tree';

  useEffect(() => {
    if (dismissed.all || dismissed[stepKey]) {
      setVisibleStep(null);
      return;
    }
    const showTimer = setTimeout(() => {
      setVisibleStep(stepKey);
    }, 450);

    const autoHideTimer = setTimeout(() => {
      setDismissed(prev => {
        const next = { ...prev, [stepKey]: true };
        saveDismissedSteps(next);
        return next;
      });
      setVisibleStep(null);
    }, 11000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(autoHideTimer);
    };
  }, [stepKey, dismissed]);

  if (!visibleStep) return null;

  const isHi = lang === 'hi';

  const copy = {
    home: isHi
      ? {
          badge: 'नया उपयोगकर्ता सुझाव · 1/3',
          text: 'शीर्षक या कार्ड पर माउस ले जाने (hover) या स्क्रॉल करने पर विस्तृत विवरण दिखाई देते हैं।'
        }
      : {
          badge: 'New User Tip · 1/3',
          text: 'Hover or focus on any heading or card to reveal its detailed explanation, or click "Explore Demo Tree" to begin.'
        },
    tree: isHi
      ? {
          badge: 'नया उपयोगकर्ता सुझाव · 2/3',
          text: 'माउस खींचकर या नीचे दिए गए तीर बटनों (← ↑ ↓ →) से कैनवास घुमाएँ। किसी भी कार्ड पर क्लिक कर उसका विवरण या दिशात्मक वृक्ष देखें।'
        }
      : {
          badge: 'New User Tip · 2/3',
          text: 'Drag, scroll, or use the dock arrows (← ↑ ↓ →) to pan. Click any person card to inspect details, add family, or view their directional tree.'
        },
    backup: isHi
      ? {
          badge: 'नया उपयोगकर्ता सुझाव · 3/3',
          text: 'यहाँ से आप एक क्लिक में JSON बैकअप कॉपी, डाउनलोड या आयात कर सकते हैं।'
        }
      : {
          badge: 'New User Tip · 3/3',
          text: 'Copy or download a portable JSON backup anytime, or paste an existing backup to restore a tree.'
        }
  }[visibleStep];

  if (!copy) return null;

  const dismissCurrent = () => {
    setDismissed(prev => {
      const next = { ...prev, [visibleStep]: true };
      saveDismissedSteps(next);
      return next;
    });
    setVisibleStep(null);
  };

  const dismissAll = () => {
    const next = { all: true, home: true, tree: true, backup: true };
    saveDismissedSteps(next);
    setDismissed(next);
    setVisibleStep(null);
  };

  return (
    <aside
      className="onboard-toast"
      role="status"
      aria-live="polite"
    >
      <div className="onboard-toast-head">
        <span className="onboard-badge">✦ {copy.badge}</span>
        <div className="onboard-toast-actions">
          {visibleStep === 'tree' && (
            <button
              type="button"
              className="onboard-link-btn"
              onClick={onOpenHelpModal}
            >
              {isHi ? 'शॉर्टकट (?)' : 'Shortcuts (?)'}
            </button>
          )}
          <button
            type="button"
            className="onboard-link-btn"
            onClick={dismissAll}
          >
            {isHi ? 'सभी बंद करें' : 'Skip tips'}
          </button>
          <button
            type="button"
            className="onboard-close-btn"
            aria-label={isHi ? 'बंद करें' : 'Dismiss tip'}
            onClick={dismissCurrent}
          >
            ×
          </button>
        </div>
      </div>
      <p className="onboard-toast-body">{copy.text}</p>
    </aside>
  );
}

export default OnboardingToast;
