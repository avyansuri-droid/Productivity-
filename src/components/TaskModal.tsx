import { useState, useEffect, useContext } from 'react';
import { X, Calendar as CalendarIcon, Clock, Tag, Flag, Bell, LayoutList } from 'lucide-react';
import { cn } from '../lib/utils';
import { useWorkspace } from '../lib/useWorkspace';
import { createCalendarEvent, sendEmail } from '../lib/google-workspace';
import { AuthContext } from './AuthProvider';

export interface TaskModalData {
  title: string;
  category: string;
  date: string;
  time: string;
  priority: boolean;
  notes: string;
  sendReminder: boolean;
  addToCalendar: boolean;
}

export function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: TaskModalData) => void;
  initialData?: Partial<TaskModalData>;
}) {
  const [data, setData] = useState<TaskModalData>({
    title: '',
    category: 'Work',
    date: '',
    time: '',
    priority: false,
    notes: '',
    sendReminder: false,
    addToCalendar: false,
    ...initialData
  });

  const { isConnected, token } = useWorkspace();
  const { user } = useContext(AuthContext);

  // Reset form when opened with new data
  useEffect(() => {
    if (isOpen) {
      setData({
        title: '',
        category: 'Work',
        date: '',
        time: '',
        priority: false,
        notes: '',
        sendReminder: false,
        addToCalendar: false,
        ...initialData
      });
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!data.title.trim()) return alert("Title is required");
    
    // Call google APIs if checked (and if it's a new task/we haven't synced)
    if (token && data.addToCalendar && !initialData?.title) {
       try { await createCalendarEvent(token, data.title, data.category, data.date, data.time, data.notes); } catch(e) { console.error('Failed calendar sync', e); }
    }
    
    if (token && data.sendReminder && user?.email && !initialData?.title) {
       try { 
         const body = `<p>Task Reminder scheduled for: <strong>${data.title}</strong></p><p>Due: ${data.date} at ${data.time}</p><p><a href="${window.location.origin}">Open Productivity Pro</a></p>`;
         await sendEmail(token, user.email, `Task Reminder: ${data.title}`, body); 
       } catch(e) { console.error('Failed email reminder', e); }
    }

    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm px-4 flex items-center justify-center z-[999]">
      <div className="bg-surface-container w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 border border-outline-variant flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-outline-variant shrink-0">
          <h2 className="text-xl font-bold text-on-surface">
            {initialData?.title ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Title *</label>
            <input 
              autoFocus
              type="text" 
              value={data.title}
              onChange={e => setData({...data, title: e.target.value})}
              className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Due Date</label>
              <input 
                type="date"
                value={data.date}
                onChange={e => setData({...data, date: e.target.value})}
                className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Due Time</label>
              <input 
                type="time" 
                value={data.time}
                onChange={e => setData({...data, time: e.target.value})}
                className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Category</label>
              <select 
                value={data.category}
                onChange={e => setData({...data, category: e.target.value})}
                className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Important">Important</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</label>
              <select 
                value={data.priority ? 'High' : 'Normal'}
                onChange={e => setData({...data, priority: e.target.value === 'High'})}
                className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider flex items-center gap-1"><LayoutList className="w-3 h-3" /> Notes</label>
            <textarea 
              value={data.notes}
              onChange={e => setData({...data, notes: e.target.value})}
              className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors min-h-[80px]"
              placeholder="Add details..."
            />
          </div>

          {isConnected && (
            <div className="bg-background rounded-xl border border-outline-variant p-4 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">Send reminder email</p>
                    <p className="text-xs text-on-surface-variant">Get an email notification at due time</p>
                  </div>
                </div>
                <div className={cn("w-10 h-6 rounded-full transition-colors relative flex items-center", data.sendReminder ? "bg-primary" : "bg-surface-variant")}>
                  <input type="checkbox" className="absolute inset-0 opacity-0 cursor-pointer" checked={data.sendReminder} onChange={e => setData({...data, sendReminder: e.target.checked})} />
                  <div className={cn("w-4 h-4 bg-on-primary rounded-full transition-transform mx-1", data.sendReminder ? "translate-x-4" : "translate-x-0")} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center"><CalendarIcon className="w-4 h-4" /></div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">Add to Google Calendar</p>
                    <p className="text-xs text-on-surface-variant">Create an event on your calendar</p>
                  </div>
                </div>
                <div className={cn("w-10 h-6 rounded-full transition-colors relative flex items-center", data.addToCalendar ? "bg-primary" : "bg-surface-variant")}>
                  <input type="checkbox" className="absolute inset-0 opacity-0 cursor-pointer" checked={data.addToCalendar} onChange={e => setData({...data, addToCalendar: e.target.checked})} />
                  <div className={cn("w-4 h-4 bg-on-primary rounded-full transition-transform mx-1", data.addToCalendar ? "translate-x-4" : "translate-x-0")} />
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-outline-variant flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow hover:opacity-90 active:scale-95 transition-all"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
