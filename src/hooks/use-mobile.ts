
import { useState, useEffect } from 'react';

type MobileInfo = {
  isMobile: boolean;
  isTouch: boolean;
  isPortrait: boolean;
  isIOS: boolean;
  isAndroid: boolean;
};

export const useIsMobile = (breakpoint = 768): MobileInfo => {
  const [state, setState] = useState<MobileInfo>({
    isMobile: false,
    isTouch: false,
    isPortrait: true,
    isIOS: false,
    isAndroid: false,
  });

  useEffect(() => {
    const checkMobile = () => {
      // Check if device is mobile based on screen width
      const isMobile = window.innerWidth < breakpoint;
      
      // Check if device supports touch
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      
      // Check OS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      setState({
        isMobile,
        isTouch,
        isPortrait,
        isIOS,
        isAndroid,
      });
    };

    // Initial check
    checkMobile();

    // Add event listeners for resize and orientation change
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, [breakpoint]);

  return state;
};

export default useIsMobile;
