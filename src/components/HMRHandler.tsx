import { useEffect } from 'react';
import subscriptionManager from '@/utils/subscriptionManager';

/**
 * This component helps preserve application state during hot module reloads
 * in development, preventing unnecessary refreshes and reconnections.
 */
const HMRHandler = () => {
  useEffect(() => {
    // Store a reference to identify if this is a full reload or HMR
    const hmrTimestamp = sessionStorage.getItem('hmr_timestamp');
    const currentTimestamp = Date.now().toString();

    if (hmrTimestamp && Date.now() - parseInt(hmrTimestamp) < 5000) {
      // This is likely an HMR update, not a full page refresh
      console.log('HMR detected, preserving application state');
    } else {
      // This is a full refresh or initial load
      console.log('Full page load detected');
      // We could initialize specific state here
    }

    // Update timestamp for next reload detection
    sessionStorage.setItem('hmr_timestamp', currentTimestamp);

    return () => {
      // Store current timestamp right before component unmounts (during HMR)
      sessionStorage.setItem('hmr_timestamp', Date.now().toString());
    };
  }, []);

  return null;
};

export default HMRHandler;