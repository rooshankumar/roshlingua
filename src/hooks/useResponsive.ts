
import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [deviceSize, setDeviceSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setDeviceSize('xs');
      } else if (width < 768) {
        setDeviceSize('sm');
      } else if (width < 1024) {
        setDeviceSize('md');
      } else if (width < 1280) {
        setDeviceSize('lg');
      } else {
        setDeviceSize('xl');
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { deviceSize };
};

export default useResponsive;
