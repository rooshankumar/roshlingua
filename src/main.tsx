import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import disableSupabaseLogs from './utils/disableSupabaseLogs'

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

createRoot(document.getElementById("root")!).render(<App />);