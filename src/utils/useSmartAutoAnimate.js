import { useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

/**
 * Wrapper around @formkit/auto-animate that provides smooth, spring-like
 * layout transitions (inspired by motion & oil-motion) while automatically
 * disabling animations when Reduced Motion is active.
 */
export function useSmartAutoAnimate(options = {}) {
  const [parentRef, setEnabled] = useAutoAnimate({
    duration: 240,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    ...options
  });

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const syncMotionPreference = () => {
      const isReduced =
        document.documentElement?.getAttribute('data-motion') === 'reduce' ||
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      if (typeof setEnabled === 'function') {
        setEnabled(!isReduced);
      }
    };

    syncMotionPreference();

    let observer = null;
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      observer = new MutationObserver(syncMotionPreference);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-motion']
      });
    }

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMotionPreference);
    }

    return () => {
      if (observer) observer.disconnect();
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncMotionPreference);
      }
    };
  }, [setEnabled]);

  return parentRef;
}

export default useSmartAutoAnimate;
