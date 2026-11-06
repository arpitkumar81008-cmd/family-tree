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
    const syncMotionPreference = () => {
      const isReduced =
        document.documentElement.getAttribute('data-motion') === 'reduce' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      setEnabled(!isReduced);
    };

    syncMotionPreference();

    const observer = new MutationObserver(syncMotionPreference);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion']
    });

    return () => observer.disconnect();
  }, [setEnabled]);

  return parentRef;
}

export default useSmartAutoAnimate;
