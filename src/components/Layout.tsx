import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckCircle2, 
  Library, 
  Mic, 
  Settings, 
  Search,
  Bell,
  Palette
} from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthProvider';
import NovaChatPanel from './NovaChatPanel';
import { Dock } from './ui/dock-two';
import { useWorkspace } from '../lib/useWorkspace';
import WorkspaceLoginScreen from './WorkspaceLoginScreen';
import ThemePickerModal from './ThemePickerModal';
import { useTheme } from '../lib/useTheme';

import FocusMode from './FocusMode';
import { TaskModal, TaskModalData } from './TaskModal';
import { useTasks } from '../lib/useTasks';

export default function Layout() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, connect, isInitializing } = useWorkspace();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [focusConfig, setFocusConfig] = useState<{isOpen: boolean, taskTitle: string}>({ isOpen: false, taskTitle: '' });
  const [taskModalConfig, setTaskModalConfig] = useState<{isOpen: boolean, initialData?: any}>({ isOpen: false });
  const { addTask } = useTasks();
  
  useTheme(); // Initialize theme on boot

  useEffect(() => {
    const handleFocusStart = (e: any) => {
      setFocusConfig({ isOpen: true, taskTitle: e.detail?.title || 'Deep Work' });
    };
    const handleOpenTaskModal = (e: any) => {
      setTaskModalConfig({ isOpen: true, initialData: e.detail });
    };
    window.addEventListener('focus:start', handleFocusStart);
    (window as any).startFocusMode = (title: string) => {
      window.dispatchEvent(new CustomEvent('focus:start', { detail: { title } }));
    };
    window.addEventListener('task:openModal', handleOpenTaskModal);
    
    return () => {
      window.removeEventListener('focus:start', handleFocusStart);
      window.removeEventListener('task:openModal', handleOpenTaskModal);
    };
  }, []);

  const handleFocusComplete = (durationInMinutes: number) => {
    const currentSessions = parseInt(localStorage.getItem('pp_focus_sessions_today') || '0', 10);
    const currentMins = parseInt(localStorage.getItem('pp_focus_minutes_today') || '0', 10);
    localStorage.setItem('pp_focus_sessions_today', (currentSessions + 1).toString());
    localStorage.setItem('pp_focus_minutes_today', (currentMins + durationInMinutes).toString());
  };

  const handleSaveGlobalTask = (data: TaskModalData) => {
    addTask(data);
    // After task is saved, we can optionally dispatch an event for Nova
    window.dispatchEvent(new CustomEvent('nova:task_saved', { detail: data }));
  };

  // Still allow access to the App layout, but show Login screen overlay if not connected
  // so that the background layout styling matches what user is used to.
  
  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/tasks', icon: CheckCircle2, label: 'Tasks' },
    { to: '/templates', icon: Library, label: 'Templates' },
    { to: '/transcriber', icon: Mic, label: 'Transcriber' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const dockItems = navLinks.map(link => ({
    icon: link.icon,
    label: link.label,
    onClick: () => navigate(link.to)
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!isConnected && !isInitializing && <WorkspaceLoginScreen onConnect={connect} />}
      {showThemePicker && <ThemePickerModal onClose={() => setShowThemePicker(false)} />}
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-y-auto">
        <FocusMode 
          isOpen={focusConfig.isOpen} 
          taskTitle={focusConfig.taskTitle} 
          onClose={() => setFocusConfig({ ...focusConfig, isOpen: false })} 
          onComplete={handleFocusComplete} 
        />
        <TaskModal 
          isOpen={taskModalConfig.isOpen} 
          onClose={() => setTaskModalConfig({ ...taskModalConfig, isOpen: false })} 
          onSave={(data) => {
            handleSaveGlobalTask(data);
            setTaskModalConfig({ ...taskModalConfig, isOpen: false });
          }}
          initialData={taskModalConfig.initialData}
        />
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 w-full bg-background border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="text-on-primary font-bold text-xl leading-none">P</span>
              </div>
              Productivity Pro
            </h2>
            <nav className="hidden md:flex gap-4 h-16 ml-4">
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-surface-container px-3 py-1.5 rounded-md border border-outline-variant">
              <Search className="w-4 h-4 text-outline mr-2" />
              <input 
                type="text" 
                placeholder="Search workspace..." 
                className="bg-transparent border-none p-0 text-sm focus:ring-0 w-64 text-on-surface placeholder:text-outline outline-none transition-all" 
              />
            </div>
            
            <button 
              onClick={() => setShowThemePicker(true)}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95"
              title="Themes"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center font-bold text-sm text-on-surface overflow-hidden">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full pb-32 pt-6 px-4 md:px-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
        
        {/* Nova AI Receptionist */}
        <NovaChatPanel />
      </main>

      {/* Floating Navigation Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
        <div className="pointer-events-auto">
          <Dock items={dockItems} className="h-24 mb-4" />
        </div>
      </div>
    </div>
  );
}
