import { useWorkspace } from '../lib/useWorkspace';
import { Mail, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

export default function WorkspaceLoginScreen({ onConnect }: { onConnect: () => void }) {
  const { isInitializing } = useWorkspace();

  if (isInitializing) return (
    <div className="fixed inset-0 bg-background flex justify-center items-center z-[9999]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background flex flex-col justify-center items-center z-[9999] px-4">
      <div className="max-w-md w-full bg-surface-container p-8 rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in-95 mt-[-10vh]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <span className="font-bold text-[#0260fa] text-[47px] italic no-underline">P</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-on-surface text-center mb-2">Welcome to Productivity Pro</h1>
        <p className="text-center text-on-surface-variant mb-8">Connect your Google Workspace to unlock powerful integrations.</p>

        <div className="space-y-4 mb-8">
          <div className="flex gap-4">
            <Mail className="text-primary mt-1" />
            <div>
              <h4 className="font-bold text-on-surface text-sm">Real-time Inbox</h4>
              <p className="text-xs text-on-surface-variant">View and reply to emails directly from your dashboard.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <CalendarIcon className="text-primary mt-1" />
            <div>
              <h4 className="font-bold text-on-surface text-sm">Calendar Sync</h4>
              <p className="text-xs text-on-surface-variant">Time-block your day and sync events automatically.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <CheckCircle className="text-primary mt-1" />
            <div>
              <h4 className="font-bold text-on-surface text-sm">Smart Reminders</h4>
              <p className="text-xs text-on-surface-variant">Get task notifications sent directly to your email.</p>
            </div>
          </div>
        </div>

        <button onClick={onConnect} className="w-full h-12 bg-on-surface text-background font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95">
          <svg width="24" height="24" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          Connect with Google
        </button>
      </div>
    </div>
  );
}
