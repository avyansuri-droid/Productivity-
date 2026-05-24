import { useEffect, useState, createContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export const AuthContext = createContext<{ user: User | null }>({ user: null });

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-on-surface">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen items-center justify-center flex bg-background text-on-surface p-6">
        <div className="text-center bg-surface-container max-w-sm w-full p-8 rounded-xl border border-outline-variant flex flex-col gap-6 items-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-on-primary">dashboard</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Productivity Pro</h1>
            <p className="text-on-surface-variant text-sm">Sign in to sync your workspace securely.</p>
          </div>
          <button 
            onClick={handleSignIn}
            className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all text-sm"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}
