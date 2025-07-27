
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const AuthDebugPanel: React.FC = () => {
  const { user, loading } = useAuth();
  const [authDetails, setAuthDetails] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const checkAuthDetails = async () => {
      try {
        // Get session details
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // Get user details
        const { data: userData, error: userError } = await supabase.auth.getUser();

        setAuthDetails({
          session: {
            data: sessionData.session,
            error: sessionError
          },
          user: {
            data: userData.user,
            error: userError
          },
          localStorage: {
            authToken: localStorage.getItem('supabase.auth.token'),
            authUser: localStorage.getItem('sb-wqojeesjtgfcftpnzaet-auth-token'),
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error checking auth details:', error);
      }
    };

    if (showDebug) {
      checkAuthDetails();
      const interval = setInterval(checkAuthDetails, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [showDebug]);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 z-50"
      >
        Debug Auth
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Auth Debug Panel</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Hook Status:</strong>
          <div className="ml-2">
            Loading: {loading ? 'Yes' : 'No'}<br/>
            User: {user ? `${user.email} (${user.id})` : 'None'}
          </div>
        </div>
        
        {authDetails && (
          <>
            <div>
              <strong>Session:</strong>
              <div className="ml-2 font-mono text-xs bg-gray-100 p-1 rounded">
                {authDetails.session.data ? 
                  `Valid until: ${new Date(authDetails.session.data.expires_at * 1000).toLocaleString()}` :
                  'No session'
                }
                {authDetails.session.error && (
                  <div className="text-red-500">Error: {authDetails.session.error.message}</div>
                )}
              </div>
            </div>
            
            <div>
              <strong>User API:</strong>
              <div className="ml-2 font-mono text-xs bg-gray-100 p-1 rounded">
                {authDetails.user.data ? 
                  `${authDetails.user.data.email}` :
                  'No user'
                }
                {authDetails.user.error && (
                  <div className="text-red-500">Error: {authDetails.user.error.message}</div>
                )}
              </div>
            </div>
            
            <div>
              <strong>Local Storage:</strong>
              <div className="ml-2 font-mono text-xs bg-gray-100 p-1 rounded">
                Auth Token: {authDetails.localStorage.authToken ? 'Present' : 'Missing'}<br/>
                Supabase Token: {authDetails.localStorage.authUser ? 'Present' : 'Missing'}
              </div>
            </div>
          </>
        )}
        
        <button
          onClick={() => window.location.href = '/auth'}
          className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
        >
          Go to Auth Page
        </button>
      </div>
    </div>
  );
};

export default AuthDebugPanel;
