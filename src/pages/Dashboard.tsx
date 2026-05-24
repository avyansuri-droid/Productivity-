import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Briefcase, AlertCircle, Plus, Clock, Tag, Search, Bell, History, FileText } from 'lucide-react';
import { useTasks } from '../lib/useTasks';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AuthContext } from '../components/AuthProvider';
import { TaskModal, TaskModalData } from '../components/TaskModal';
import { useWorkspace } from '../lib/useWorkspace';

import { getNOVAContext } from '../lib/novaContext';
import { sendEmail } from '../lib/google-workspace';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  }).format(date);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, updateTask, addTask, deleteTask } = useTasks();
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const { isConnected, token } = useWorkspace();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isConnected && token) {
      fetchEmails();
    }
  }, [isConnected, token]);

  const shouldSendWeeklyReport = async () => {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const isAfter7am = now.getHours() >= 7;
    const lastSent = localStorage.getItem('pp_last_weekly_report');
    const alreadySentThisWeek = lastSent && new Date(lastSent).toDateString() === now.toDateString();
    
    if (isMonday && isAfter7am && !alreadySentThisWeek && token && user?.email) {
      const apiKey = localStorage.getItem('nova_gemini_key');
      if (!apiKey) return;
      
      try {
        const promptParams = `Write a friendly, motivating weekly productivity report email. 
Use this data: ${getNOVAContext()}. 
Format it as clean HTML email with dark-friendly inline styles (like dark grays, slate, and primary color accents).
Include sections: Week Summary, Tasks Completed, Upcoming This Week, One Motivational Insight. Sign it as 'Nova, your AI Receptionist'.
Keep it under 300 words. No fake names.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptParams }] }] })
          }
        );
        const data = await response.json();
        const htmlBody = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (htmlBody) {
          const cleanHtml = htmlBody.replace(/```(html)?/gi, '').trim();
          await sendEmail(
            token, 
            user.email, 
            `✦ Your Weekly Productivity Report — ${now.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}`, 
            cleanHtml
          );
          localStorage.setItem('pp_last_weekly_report', now.toISOString());
          // Optional: signal Nova to say she sent it
          window.dispatchEvent(new CustomEvent('nova:sysmsg', { 
            detail: `Good morning! I just sent your weekly productivity report to your inbox. Take a look when you have a moment.` 
          }));
        }
      } catch (e) {
        console.error("Failed to generate/send weekly report", e);
      }
    }
  };

  const fetchEmails = async () => {
    if (!token) return;
    setIsGmailLoading(true);
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.messages) {
        const messageDetails = await Promise.all(
          data.messages.map(async (msg: any) => {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const msgData = await msgRes.json();
            return {
              id: msg.id,
              snippet: msgData.snippet || '',
              subject: msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '',
              sender: msgData.payload?.headers?.find((h: any) => h.name === 'From')?.value || '',
              unread: msgData.labelIds?.includes('UNREAD') || false,
              date: new Date(parseInt(msgData.internalDate)).toISOString(),
              raw: msgData
            };
          })
        );
        setGmailMessages(messageDetails);
        localStorage.setItem('pp_emails', JSON.stringify(messageDetails));
        
        // Upgrade 2: Smart Email Task Suggestions
        const actionableEmails = messageDetails.filter((e: any) => {
          if (!e.unread) return false;
          if (Date.now() - new Date(e.date).getTime() > 48 * 60 * 60 * 1000) return false;
          
          const textToCheck = `${e.subject} ${e.snippet}`.toLowerCase();
          const signals = ["please review", "action required", "follow up", "follow-up", "get back to me", "let me know", "can you", "could you", "deadline", "asap", "urgent", "waiting on you", "your feedback", "approval needed", "respond by"];
          return signals.some(s => textToCheck.includes(s));
        });
        
        if (actionableEmails.length > 0) {
          window.dispatchEvent(new CustomEvent('nova:suggestions', { detail: actionableEmails }));
        }
      }
      
      // Upgrade 3: Weekly Report Email check
      shouldSendWeeklyReport();
      
    } catch (e) {

      console.error(e);
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleSaveTask = (data: TaskModalData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  const todayTasks = tasks.filter(t => {
    // If it has a date, include if date is today or earlier (overdue)
    if (t.date) {
      const isTodayOrPast = new Date(t.date) <= new Date();
      return isTodayOrPast && !t.completed || (t.completed && t.date === new Date().toISOString().split('T')[0]);
    }
    // If no date, just show if not completed or completed today
    return !t.completed || new Date(t.createdAt?.toMillis?.() || Date.now()).toDateString() === new Date().toDateString();
  });

  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;
  const progressPercent = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  const personalTasks = tasks.filter(t => t.category?.toLowerCase() === 'personal' && !t.completed);
  const workTasks = tasks.filter(t => t.category?.toLowerCase() === 'work' && !t.completed);
  const importantTasks = tasks.filter(t => t.priority && !t.completed);

  const greetingText = `${getGreeting()}.`;

  function getRecentActivity() {
    const items = [];
    
    const allTasks = JSON.parse(localStorage.getItem('pp_tasks') || '[]');
    const recentTask = allTasks
      .filter((t: any) => !t.completed)
      .sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (Date.parse(a.createdAt) || 0);
          const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (Date.parse(b.createdAt) || 0);
          return bTime - aTime;
      })[0];
    if(recentTask) items.push({
      icon: '✓',
      title: recentTask.title,
      sub: (recentTask.category || 'General') + ' · ' + (recentTask.time || 'No time set'),
      action: () => navigate('/tasks')
    });

    const trans = JSON.parse(localStorage.getItem('pp_trans') || '[]');
    const recentTrans = trans[0];
    if(recentTrans) items.push({
      icon: '🎙',
      title: recentTrans.title,
      sub: (recentTrans.tag || 'Voice') + ' · ' + (recentTrans.date || ''),
      action: () => navigate('/transcriber')
    });

    const events = JSON.parse(localStorage.getItem('pp_events') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const parseEventDate = (e: any) => e.start?.date || (e.start?.dateTime ? e.start.dateTime.split('T')[0] : '');
    const nextEvent = events
      .filter((e: any) => parseEventDate(e) >= today)
      .sort((a: any, b: any) => parseEventDate(a).localeCompare(parseEventDate(b)))[0];
    if(nextEvent) items.push({
      icon: '📅',
      title: nextEvent.summary || nextEvent.title,
      sub: 'Upcoming · ' + parseEventDate(nextEvent),
      action: () => navigate('/calendar')
    });

    return items;
  }

  const recentItems = getRecentActivity();

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-8">
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask || undefined}
      />
      {/* Greeting Header */}
      <section className="mb-12">
        <h1 className="text-[32px] font-bold text-on-surface mb-2 tracking-tight leading-tight">
          {greetingText}
        </h1>
        <p className="text-on-surface-variant text-lg">
          It's {formatDate(currentDate)}. You have {totalToday - completedToday} tasks to focus on today.
        </p>
      </section>

      {/* Progress Box */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface mb-1 flex items-center gap-3">
              Today's Focus
              <button 
                onClick={() => {
                  const highPriority = todayTasks.find(t => t.priority && !t.completed);
                  const focusTaskTitle = highPriority ? highPriority.title : (todayTasks.find(t => !t.completed)?.title || 'Deep Work');
                  if ((window as any).startFocusMode) {
                    (window as any).startFocusMode(focusTaskTitle);
                  }
                }}
                className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-lg uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
              >
                Start Focus
              </button>
            </h2>
            <p className="text-on-surface-variant text-sm">You've completed {completedToday} of {totalToday} tasks for today.</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-primary rounded-full" 
          />
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-surface-container border border-outline-variant rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="text-primary w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">Personal</span>
          </div>
          <div className="text-4xl font-bold mb-2 text-on-surface">{String(personalTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-on-surface-variant font-medium">pending tasks</div>
        </div>
        
        <div className="p-6 bg-surface-container border border-outline-variant rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="text-primary w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest text-on-surface-variant">Work</span>
          </div>
          <div className="text-4xl font-bold mb-2 text-on-surface">{String(workTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-on-surface-variant font-medium">pending tasks</div>
        </div>

        <div className="p-6 bg-primary text-on-primary rounded-xl shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-on-primary w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest opacity-80">Important</span>
          </div>
          <div className="text-4xl font-bold mb-2">{String(importantTasks.length).padStart(2, '0')}</div>
          <div className="text-xs opacity-80 font-medium">Due by end of day</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Active Tasks List */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-on-surface">Active Tasks</h3>
            <button 
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="p-8 text-center bg-surface-container border border-outline-variant rounded-xl">
                <p className="text-on-surface-variant">No tasks here. Add your first one!</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <motion.div 
                  layout
                  key={task.id}
                  className={cn(
                    "group flex items-center p-4 bg-surface-container border rounded-xl transition-all cursor-pointer hover:border-primary relative overflow-hidden",
                    task.priority ? "border-l-4 border-l-primary border-outline-variant" : "border-outline-variant"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="mr-5 z-10 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTask(task.id, { completed: !task.completed });
                      }}
                      className={cn(
                        "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                        task.completed 
                          ? "bg-primary border-primary" 
                          : "border-outline-variant hover:border-primary bg-background"
                      )}
                    >
                      {task.completed && <div className="w-3 h-3 bg-on-primary" style={{ clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                    </button>
                  </div>
                  
                  <div className="flex-grow z-10 min-w-0">
                    <h4 
                      className={cn(
                      "font-semibold text-base mb-1 transition-all",
                      task.completed ? "text-on-surface-variant line-through" : "text-on-surface group-hover:text-primary"
                    )}>
                      {task.title}
                    </h4>
                    <div className="flex gap-3">
                      {task.time && (
                        <span className={cn(
                          "text-xs font-medium flex items-center gap-1",
                          task.priority && !task.completed ? "text-error" : "text-on-surface-variant"
                        )}>
                          <Clock className="w-3.5 h-3.5" /> {task.time}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[10px] px-2 py-0.5 bg-surface-container-highest text-on-surface-variant rounded-full font-bold uppercase">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-error transition-all z-10"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>

                  {/* Strikethrough Animation Background */}
                  {task.completed && (
                    <motion.div 
                      layoutId={`strike-${task.id}`}
                      className="absolute inset-0 bg-surface-variant/20 pointer-events-none" 
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="md:col-span-4 space-y-8">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
               <h3 className="text-lg font-bold text-on-surface mb-2">Weekly Focus</h3>
               <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                 You've completed {progressPercent}% of your goals this week.
               </p>
               <div className="h-1.5 bg-background rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }} 
                   animate={{ width: `${progressPercent}%` }} 
                   transition={{ duration: 1 }}
                   className="h-full bg-primary" 
                 />
               </div>
             </div>
             {/* Decorative lightning or similar */}
             <div className="absolute -right-4 -bottom-4 opacity-5 scale-150 transform group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
               <svg fill="currentColor" width="120" height="120" viewBox="0 0 24 24"><path d="M11 21l-1-9H6l8-10v8h4l-6 11z"/></svg>
             </div>
          </div>

          {(isGmailLoading || gmailMessages.length > 0) && (
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-on-surface">Inbox</h3>
                <span className="bg-primary text-on-primary px-2 py-0.5 rounded-full text-[10px] font-bold">BETA</span>
              </div>
              <div className="space-y-5">
                {isGmailLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4 items-start animate-pulse">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-surface-variant shrink-0"></div>
                        <div className="flex-grow">
                          <div className="h-4 bg-surface-variant rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-surface-variant rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gmailMessages.map((msg, idx) => {
                      const subject = msg.subject;
                      const from = msg.sender;
                      // clean up the from address
                      const senderName = from.split('<')[0].trim();
                      const senderEmailMatch = from.match(/<([^>]+)>/);
                      const senderEmail = senderEmailMatch ? senderEmailMatch[1] : senderName;
                      
                      return (
                        <div key={idx} className="flex gap-4 group">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0"></div>
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium text-on-surface leading-snug truncate">
                              {subject || <span className="italic text-on-surface-variant">(No subject)</span>}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-1">{senderName}</p>
                          </div>
                          <a 
                            href={`mailto:${senderEmail}?subject=Re: ${encodeURIComponent(subject)}`}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-surface-variant text-on-surface text-xs font-bold rounded-lg transition-all hover:bg-outline-variant whitespace-nowrap self-start mt-1"
                          >
                            Reply
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Jump back in */}
      {recentItems.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <History className="text-on-surface-variant w-5 h-5" />
            <h3 className="text-lg font-bold text-on-surface">Jump back in</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentItems.map((item, i) => (
              <div key={i} onClick={item.action} className="bg-surface-container border border-outline-variant rounded-xl p-5 hover:bg-surface-variant cursor-pointer transition-colors flex flex-col items-start gap-4 h-32">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="min-w-0 w-full">
                  <h4 className="text-sm font-bold text-on-surface truncate w-full" title={item.title}>{item.title}</h4>
                  <p className="text-xs text-on-surface-variant mt-1 truncate">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
