import { useState, useContext, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthContext } from '../components/AuthProvider';

export default function Settings() {
  const { user } = useContext(AuthContext);
  const [displayName, setDisplayName] = useState('');
  const [defaultCategory, setDefaultCategory] = useState(localStorage.getItem('productivity_pro_category') || 'Work');
  const [emailNotifs, setEmailNotifs] = useState(localStorage.getItem('productivity_pro_email_notifs') === 'true');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || localStorage.getItem('productivity_pro_name') || '');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('productivity_pro_name', displayName);
      localStorage.setItem('productivity_pro_category', defaultCategory);
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        // Force reload the window to update standard context
        window.location.reload();
      } else {
        alert('Settings saved locally!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-8 w-full">
      <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-8">Settings</h1>
      
      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 space-y-8">
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">Display Name</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Preferred name"
            className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface focus:border-primary outline-none transition-colors"
          />
          <p className="text-xs text-on-surface-variant mt-2">Optional. Only used for personalization.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">Email Address</label>
          <input 
            type="email" 
            value={user?.email || ''}
            disabled
            className="w-full bg-surface-container border border-outline-variant px-4 py-3 rounded-xl text-on-surface-variant outline-none opacity-70 cursor-not-allowed"
          />
          <p className="text-xs text-on-surface-variant mt-2">Your connected Google account.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">Default Task Category</label>
          <select 
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface focus:border-primary outline-none transition-colors appearance-none"
          >
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="General">General</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">Email Notifications</label>
              <p className="text-xs text-on-surface-variant max-w-sm">Receive email reminders when your tasks are due. Emails will be sent to your connected Google account.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={emailNotifs}
                onChange={(e) => {
                  setEmailNotifs(e.target.checked);
                  localStorage.setItem('productivity_pro_email_notifs', String(e.target.checked));
                }}
              />
              <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
