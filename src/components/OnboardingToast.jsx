import React, { useEffect, useState } from 'react';

const ONBOARD_KEY = 'gupta_onboard_steps_v2';

function loadDismissedSteps() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ONBOARD_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveDismissedSteps(map) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ONBOARD_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota or security errors
  }
}

export function OnboardingToast({
  currentView = 'home',
  activeTab = 'rel',
  lang = 'en',
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
          badge: 'सुझाव · 1/3',
          text: 'अधिक जानकारी के लिए किसी भी कार्ड पर होवर या फ़ोकस करें, या शुरुआत के लिए "डेमो देखें" चुनें।'
        }
      : {
          badge: 'Quick Tip · 1/3',
          text: 'Hover or focus on any card for details, or select "Explore Demo Tree" to step inside.'
        },
    tree: isHi
      ? {
          badge: 'सुझाव · 2/3',
          text: 'कैनवास घुमाने के लिए खींचें या नीचे दाएँ ✦ नियंत्रण खोलें। विवरण और रिश्ते देखने के लिए किसी भी कार्ड को चुनें।'
        }
      : {
          badge: 'Quick Tip · 2/3',
          text: 'Drag to pan or open the ✦ dock below to zoom and fit. Select any card to view details or add family.'
        },
    backup: isHi
      ? {
          badge: 'सुझाव · 3/3',
          text: 'किसी भी समय एक क्लिक में अपने वंश का पोर्टेबल बैकअप कॉपी, डाउनलोड या पुनर्स्थापित करें।'
        }
      : {
          badge: 'Quick Tip · 3/3',
          text: 'Copy or download a portable JSON backup anytime, or paste a saved snapshot to restore.'
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
              onClick={() => onOpenHelpModal?.()}
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
