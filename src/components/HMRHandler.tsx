
import { useEffect, useState } from 'react';

/**
 * Component that helps manage Vite's Hot Module Replacement
 * and provides improved connection handling
 */
const HMRHandler = () => {
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (import.meta.hot) {
      // When HMR is trying to reconnect
      import.meta.hot.on('vite:beforeUpdate', () => {
        setIsReconnecting(true);
      });

      // When HMR successfully reconnects
      import.meta.hot.on('vite:afterUpdate', () => {
        setIsReconnecting(false);
      });

      // When HMR connection is lost
      import.meta.hot.on('vite:error', (error) => {
        console.log('HMR Error:', error);
        // Try to recover by forcing a reconnection
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      });
    }

    return () => {
      if (import.meta.hot) {
        import.meta.hot.off('vite:beforeUpdate');
        import.meta.hot.off('vite:afterUpdate');
        import.meta.hot.off('vite:error');
      }
    };
  }, []);

  // Render a small indicator when reconnecting
  if (isReconnecting) {
    return (
      <div className="fixed bottom-4 right-4 bg-primary/80 text-white px-3 py-1 rounded-md z-[9999] text-xs animate-pulse">
        Updating...
      </div>
    );
  }

  return null;
};

export default HMRHandler;
