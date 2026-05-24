import { useState, useEffect } from 'react';
import { initAuth, googleSignIn, getAccessToken } from './google-workspace';

export function useWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsub = initAuth(
      (_, t) => { setToken(t); setIsInitializing(false); },
      () => { setToken(null); setIsInitializing(false); }
    );
    return () => unsub();
  }, []);

  const connect = async () => {
    try {
      const result = await googleSignIn();
      if (result) setToken(result.accessToken);
    } catch (e) {
      console.error(e);
      alert('Failed to connect to Workspace.');
    }
  };

  return { token, isConnected: !!token, connect, isInitializing };
}
