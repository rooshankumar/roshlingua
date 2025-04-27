import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import disableSupabaseLogs from './utils/disableSupabaseLogs'
import { supabase } from './lib/supabase'

// Disable Supabase debug logs in production
if (import.meta.env.PROD) {
  disableSupabaseLogs();
} else {
  // Only disable sensitive parts in development
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (
      args.length > 0 && 
      typeof args[0] === 'string' && 
      args[0].includes('access_token')
    ) {
      args[0] = args[0].replace(/(access_token['"]?: ['"])[^'"]+(['"])/g, '$1[REDACTED]$2');
      args[0] = args[0].replace(/(refresh_token['"]?: ['"])[^'"]+(['"])/g, '$1[REDACTED]$2');
    }
    originalConsoleLog.apply(console, args);
  };
}

// Configure global Supabase real-time reconnection logic
const handleReconnection = () => {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000; // 3 seconds

  // Listen for WebSocket status changes
  const { data: { subscription } } = supabase.channel('system').subscribe(status => {
    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      console.log(`Real-time connection lost (${status}), attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);

      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log('Attempting to reconnect to Supabase real-time...');
          // Force refresh the connection
          supabase.realtime.disconnect();
          supabase.realtime.connect();
        }, reconnectInterval * reconnectAttempts); // Exponential backoff
      } else {
        console.error('Failed to reconnect after maximum attempts');
        // Optional: You could reload the page here as a last resort
        // window.location.reload();
      }
    } else if (status === 'SUBSCRIBED') {
      console.log('Successfully connected to Supabase real-time');
      reconnectAttempts = 0; // Reset counter on successful connection
    }
  });
};

// Start the reconnection handler
handleReconnection();

createRoot(document.getElementById("root")!).render(<App />);