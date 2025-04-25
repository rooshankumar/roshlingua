
import { useState, useEffect } from 'react';

type DeviceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type ResponsiveInfo = {
  isMobile: boolean;
  isTouch: boolean;
  isPortrait: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  deviceSize: DeviceSize;
  fontSize: {
    base: string;
    small: string;
    large: string; 
    heading: string;
  };
  iconSize: {
    small: number;
    base: number;
    large: number;
  };
};

// Breakpoints aligned with Tailwind's default breakpoints
const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const useResponsive = (mobileBreakpoint = 768): ResponsiveInfo => {
  const [state, setState] = useState<ResponsiveInfo>({
    isMobile: false,
    isTouch: false,
    isPortrait: true,
    isIOS: false,
    isAndroid: false,
    deviceSize: 'md',
    fontSize: {
      base: '16px',
      small: '14px',
      large: '18px',
      heading: '24px'
    },
    iconSize: {
      small: 16,
      base: 20,
      large: 24
    }
  });
  
  const updateResponsiveInfo = () => {
    // Get screen width
    const width = window.innerWidth;
    
    // Determine device size based on width
    let deviceSize: DeviceSize = 'md';
    if (width < 480) deviceSize = 'xs';
    else if (width < 640) deviceSize = 'sm';
    else if (width < 768) deviceSize = 'md';
    else if (width < 1024) deviceSize = 'lg';
    else deviceSize = 'xl';
    
    // Check for mobile and touch
    const isMobile = width < mobileBreakpoint;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Detect iOS or Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Responsive font sizes based on device size
    let fontSize = {
      base: '16px',
      small: '14px',
      large: '18px',
      heading: '24px'
    };
    
    let iconSize = {
      small: 16,
      base: 20,
      large: 24
    };
    
    // Adjust sizes based on device size
    if (deviceSize === 'xs') {
      fontSize = {
        base: '14px',
        small: '12px',
        large: '16px',
        heading: '20px'
      };
      iconSize = {
        small: 16,
        base: 20,
        large: 24
      };
    } else if (deviceSize === 'sm') {
      fontSize = {
        base: '15px',
        small: '13px',
        large: '17px',
        heading: '22px'
      };
      iconSize = {
        small: 16,
        base: 22,
        large: 26
      };
    } else {
      fontSize = {
        base: '16px',
        small: '14px',
        large: '18px',
        heading: '24px'
      };
      iconSize = {
        small: 18,
        base: 24,
        large: 28
      };
    }
    
    setState({
      isMobile,
      isTouch,
      isPortrait,
      isIOS,
      isAndroid,
      deviceSize,
      fontSize,
      iconSize
    });
  };

  useEffect(() => {
    const updateResponsiveInfo = () => {
      // Check if device is mobile based on screen width
      const width = window.innerWidth;
      const isMobile = width < mobileBreakpoint;
      
      // Determine device size category
      let deviceSize: DeviceSize = 'md';
      if (width < breakpoints.sm) deviceSize = 'xs';
      else if (width < breakpoints.md) deviceSize = 'sm';
      else if (width < breakpoints.lg) deviceSize = 'md';
      else if (width < breakpoints.xl) deviceSize = 'lg';
      else deviceSize = 'xl';
      
      // Get font sizes based on device
      const fontSize = {
        base: deviceSize === 'xs' ? '16px' : deviceSize === 'sm' ? '16px' : '16px',
        small: deviceSize === 'xs' ? '14px' : deviceSize === 'sm' ? '14px' : '14px',
        large: deviceSize === 'xs' ? '18px' : deviceSize === 'sm' ? '20px' : '22px',
        heading: deviceSize === 'xs' ? '20px' : deviceSize === 'sm' ? '24px' : '30px',
      };
      
      // Get icon sizes based on device
      const iconSize = {
        small: deviceSize === 'xs' ? 16 : deviceSize === 'sm' ? 16 : 18,
        base: deviceSize === 'xs' ? 18 : deviceSize === 'sm' ? 20 : 24,
        large: deviceSize === 'xs' ? 24 : deviceSize === 'sm' ? 28 : 32,
      };
      
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
        deviceSize,
        fontSize,
        iconSize
      });
    };

    // Initial check
    updateResponsiveInfo();

    // Add event listeners for resize and orientation change
    window.addEventListener('resize', updateResponsiveInfo);
    window.addEventListener('orientationchange', updateResponsiveInfo);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateResponsiveInfo);
      window.removeEventListener('orientationchange', updateResponsiveInfo);
    };
  }, [mobileBreakpoint]);

  return state;
};

// For backward compatibility
export const useIsMobile = (breakpoint = 768) => {
  const responsive = useResponsive(breakpoint);
  return {
    isMobile: responsive.isMobile,
    isTouch: responsive.isTouch,
    isPortrait: responsive.isPortrait,
    isIOS: responsive.isIOS,
    isAndroid: responsive.isAndroid
  };
};

export default useResponsive;
