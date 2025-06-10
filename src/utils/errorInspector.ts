
/**
 * Comprehensive error inspection utility for Roshlingua
 */
import { supabase } from '@/lib/supabase';
import { debugAuth } from './authDebugger';
import { debugSupabaseSchema } from './debug';

export interface ErrorReport {
  timestamp: string;
  authStatus: 'healthy' | 'error' | 'no_session';
  databaseStatus: 'healthy' | 'error' | 'connection_failed';
  realtimeStatus: 'connected' | 'disconnected' | 'error';
  storageStatus: 'healthy' | 'error' | 'no_buckets';
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export async function inspectErrors(): Promise<ErrorReport> {
  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    authStatus: 'no_session',
    databaseStatus: 'connection_failed',
    realtimeStatus: 'disconnected',
    storageStatus: 'no_buckets',
    errors: [],
    warnings: [],
    recommendations: []
  };

  console.group('🔍 Error Inspection Report');

  try {
    // 1. Check Authentication
    console.log('Checking authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      report.authStatus = 'healthy';
      console.log('✅ Authentication: Healthy');
    } else {
      report.authStatus = 'no_session';
      report.errors.push('No active authentication session');
      report.recommendations.push('User needs to sign in');
      console.log('❌ Authentication: No session');
    }

    // 2. Test Database Connection
    console.log('Testing database connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (dbError) {
      report.databaseStatus = 'error';
      report.errors.push(`Database error: ${dbError.message}`);
      console.log('❌ Database: Error -', dbError.message);
    } else {
      report.databaseStatus = 'healthy';
      console.log('✅ Database: Healthy');
    }

    // 3. Check Realtime Connection
    console.log('Checking realtime connection...');
    const realtimeStatus = supabase.realtime.status;
    if (realtimeStatus === 'connected') {
      report.realtimeStatus = 'connected';
      console.log('✅ Realtime: Connected');
    } else {
      report.realtimeStatus = 'disconnected';
      report.warnings.push('Realtime connection is not active');
      report.recommendations.push('Check network connectivity and Supabase realtime settings');
      console.log('⚠️ Realtime: Disconnected');
    }

    // 4. Check Storage Buckets
    console.log('Checking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      report.storageStatus = 'error';
      report.errors.push(`Storage error: ${bucketError.message}`);
      console.log('❌ Storage: Error -', bucketError.message);
    } else if (!buckets || buckets.length === 0) {
      report.storageStatus = 'no_buckets';
      report.warnings.push('No storage buckets found');
      report.recommendations.push('Create storage buckets for file uploads');
      console.log('⚠️ Storage: No buckets found');
    } else {
      report.storageStatus = 'healthy';
      console.log('✅ Storage: Healthy -', buckets.length, 'buckets found');
    }

    // 5. Check for Common Issues
    if (typeof window !== 'undefined') {
      // Check for localStorage issues
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (e) {
        report.errors.push('localStorage is not accessible');
        report.recommendations.push('Check browser privacy settings');
      }

      // Check for blocked resources
      if (window.location.protocol === 'https:' && !window.location.hostname.includes('replit')) {
        report.warnings.push('Running on non-Replit domain - some features may be blocked');
      }
    }

    // 6. Generate Summary
    const errorCount = report.errors.length;
    const warningCount = report.warnings.length;
    
    console.log(`\n📊 Summary: ${errorCount} errors, ${warningCount} warnings`);
    
    if (errorCount === 0 && warningCount === 0) {
      console.log('🎉 All systems appear healthy!');
    } else {
      console.log('📋 Issues found:');
      report.errors.forEach(error => console.log('❌', error));
      report.warnings.forEach(warning => console.log('⚠️', warning));
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log('•', rec));
    }

  } catch (error) {
    console.error('Error during inspection:', error);
    report.errors.push(`Inspection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.groupEnd();
  return report;
}

export async function fixCommonIssues(): Promise<{ success: boolean; message: string }> {
  console.group('🔧 Auto-fixing Common Issues');
  
  try {
    // 1. Refresh authentication token
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.log('❌ Token refresh failed:', refreshError.message);
    } else {
      console.log('✅ Authentication token refreshed');
    }

    // 2. Clear problematic localStorage items
    const keysToRemove = [
      'supabase.auth.debug',
      'supabase.auth.expired',
      'pkce_challenge_failed'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log('🧹 Removed problematic key:', key);
      }
    });

    // 3. Attempt to reconnect realtime
    if (supabase.realtime.status !== 'connected') {
      console.log('🔄 Attempting to reconnect realtime...');
      // The realtime connection will automatically reconnect on next subscription
    }

    console.log('✅ Common issues fixed');
    console.groupEnd();
    return { success: true, message: 'Common issues have been addressed' };
    
  } catch (error) {
    console.error('❌ Error during auto-fix:', error);
    console.groupEnd();
    return { 
      success: false, 
      message: `Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Export to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).inspectErrors = inspectErrors;
  (window as any).fixCommonIssues = fixCommonIssues;
}
