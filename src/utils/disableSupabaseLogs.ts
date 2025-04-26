
/**
 * This utility disables verbose Supabase authentication logs in the console
 * that might expose sensitive information
 */

export const disableSupabaseLogs = () => {
  if (typeof window !== 'undefined') {
    // Override console methods to filter out Supabase GoTrueClient logs
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      // Filter out GoTrueClient logs
      if (
        args.length > 0 && 
        typeof args[0] === 'string' && 
        (args[0].includes('GoTrueClient') || 
         args[0].includes('supabase') ||
         args[0].includes('sb-auth-token'))
      ) {
        // Skip these logs
        return;
      }
      originalConsoleLog.apply(console, args);
    };
  }
};

export default disableSupabaseLogs;
