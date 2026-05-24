import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isAfter,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, Star, CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTasks } from '../lib/useTasks';
import { showPrompt, showConfirm } from '../components/PromptModal';
import { useWorkspace } from '../lib/useWorkspace';
import { TaskModal, TaskModalData } from '../components/TaskModal';

export default function Calendar() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { isConnected, token } = useWorkspace();
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  const calendarTasks = tasks.filter(t => t.date);

  useEffect(() => {
    if (isConnected && token) {
      fetchGoogleEvents();
    }
  }, [isConnected, token, currentDate]);

  const fetchGoogleEvents = async () => {
    if (!token) return;
    try {
      const timeMin = startOfMonth(currentDate).toISOString();
      const timeMax = endOfMonth(currentDate).toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.items) {
        setGoogleEvents(data.items);
        localStorage.setItem('pp_events', JSON.stringify(data.items));
      }
    } catch (e) {
      console.error('Failed to fetch calendar events', e);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string>('');

  const handleAddTask = (dateStr: string) => {
    setEditingTask(null);
    setDefaultDateForModal(dateStr);
    setIsModalOpen(true);
  };

  const handleEditTask = (e: any, id: string, currentTitle: string) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setIsModalOpen(true);
    }
  };

  const handleSaveTask = (data: TaskModalData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  const renderHeader = () => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-primary font-bold tracking-widest text-[10px] uppercase mb-1">Schedule Overview</p>
          <h2 className="text-4xl font-black text-on-surface tracking-tight">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container rounded-lg p-1 shadow-sm border border-outline-variant">
            <button onClick={prevMonth} className="p-2 hover:bg-surface-variant rounded-md transition-colors text-on-surface">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToday} className="px-4 text-sm font-bold border-x border-outline-variant text-on-surface">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-surface-variant rounded-md transition-colors text-on-surface">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => handleAddTask(format(new Date(), 'yyyy-MM-dd'))}
            className="flex items-center gap-2 bg-on-surface text-background px-4 py-2.5 rounded-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Header row
    const headerRow = (
      <div className="grid grid-cols-7 border-b border-outline-variant" key="header">
        {weekDays.map(d => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider">{d}</div>
        ))}
      </div>
    );

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayEvents = calendarTasks.filter(e => e.date === dateStr);
        const dayGoogleEvents = googleEvents.filter(e => {
          if (e.start?.date) return e.start.date === dateStr;
          if (e.start?.dateTime) return e.start.dateTime.split('T')[0] === dateStr;
          return false;
        });

        days.push(
          <div
            className={cn(
              "aspect-square p-2 border-r border-b border-outline-variant hover:bg-surface-variant transition-colors group cursor-pointer relative overflow-hidden",
              !isSameMonth(day, monthStart) && "opacity-30",
              isSameDay(day, new Date()) && "ring-2 ring-inset ring-on-surface/20 bg-surface-container-highest"
            )}
            key={day.toString()}
            onClick={() => handleAddTask(dateStr)}
          >
            <span className={cn(
              "text-xs font-bold px-2 py-1 inline-block mb-1",
              isSameDay(day, new Date()) ? "bg-on-surface text-background rounded-md px-2" : "text-on-surface"
            )}>
              {formattedDate}
            </span>
            
            <div className="mt-1 space-y-1 px-1 overflow-y-auto no-scrollbar max-h-[calc(100%-24px)]">
              {dayGoogleEvents.map(ev => (
                <div 
                  key={ev.id} 
                  className="bg-accent/20 text-accent text-[9px] px-1.5 py-1 rounded font-bold truncate flex items-center gap-1"
                  title={ev.summary}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {ev.summary}
                </div>
              ))}
              {dayEvents.map(ev => (
                <div 
                  key={ev.id} 
                  onClick={(e) => handleEditTask(e, ev.id, ev.title)}
                  className={cn(
                    "text-[9px] px-1.5 py-1 rounded font-bold truncate transition-all hover:brightness-90 cursor-text",
                    ev.completed ? "bg-surface-variant text-on-surface-variant line-through" :
                    ev.priority ? "bg-red-500/20 text-red-500" : "bg-primary/20 text-primary"
                  )}
                  title={ev.title}
                >
                  {ev.title}
                </div>
              ))}
            </div>
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-3 h-3 text-on-surface-variant" />
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-surface-container rounded-xl border border-outline-variant shadow-xl overflow-hidden mb-6">
        {headerRow}
        {rows}
      </div>
    );
  };

  const now = new Date();
  
  // Real stats parsing
  const upcomingTasks = calendarTasks
    .filter(t => t.date && !t.completed && (isAfter(parseISO(t.date), now) || isSameDay(parseISO(t.date), now)))
    .sort((a, b) => a.date!.localeCompare(b.date!));

  const thisMonthTasks = calendarTasks.filter(t => t.date && isSameMonth(parseISO(t.date), currentDate));
  const completedThisMonth = thisMonthTasks.filter(t => t.completed).length;
  const totalThisMonth = thisMonthTasks.length;
  const monthCompletionRate = totalThisMonth ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-6 lg:px-8">
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask || (defaultDateForModal ? { date: defaultDateForModal } : undefined)}
      />
      {renderHeader()}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          {renderCells()}
          
          <div className="mt-8 mb-8 border border-outline-variant bg-surface-container rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-outline-variant bg-background flex items-center justify-between">
              <h3 className="font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Daily Schedule: {format(selectedDate, 'MMM do')}
              </h3>
              <button 
                onClick={() => handleAddTask(format(selectedDate, 'yyyy-MM-dd'))}
                className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
            <div className="h-[400px] overflow-y-auto no-scrollbar relative p-2">
              {Array.from({ length: 24 }).map((_, hour) => {
                const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                const isSelectedDayAndPast = isSameDay(selectedDate, new Date()) && new Date().getHours() > hour && new Date().getHours() !== hour;
                const isCurrentHour = isSameDay(selectedDate, new Date()) && new Date().getHours() === hour;
                
                return (
                  <div key={hour} className="flex min-h-[60px] border-b border-outline-variant/30 group">
                    <div className="w-16 shrink-0 text-[10px] font-bold text-on-surface-variant pr-4 py-2 border-r border-outline-variant/30 relative">
                      {hour === 12 ? '12 PM' : hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      {isCurrentHour && <div className="absolute right-[-4px] top-4 w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div 
                      className="flex-grow py-1 px-2 cursor-pointer hover:bg-surface-variant/50 transition-colors"
                      onClick={() => handleAddTask(format(selectedDate, 'yyyy-MM-dd'))}
                    >
                      {/* We could map tasks with this specific time here */}
                      {tasks.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd') && t.time && parseInt(t.time.split(':')[0]) === hour).map(ev => (
                        <div key={ev.id} className="bg-primary/10 border border-primary/20 p-2 rounded-lg mb-1 flex items-center justify-between" onClick={(e) => handleEditTask(e, ev.id, ev.title)}>
                          <span className={cn("text-xs font-bold", ev.completed ? "line-through text-on-surface-variant" : "text-primary")}>{ev.title}</span>
                          <span className="text-[10px] text-on-surface-variant">{ev.time}</span>
                        </div>
                      ))}
                      {googleEvents.filter(e => {
                        const evtStart = e.start?.dateTime;
                        return evtStart && evtStart.split('T')[0] === format(selectedDate, 'yyyy-MM-dd') && new Date(evtStart).getHours() === hour;
                      }).map(ev => (
                        <div key={ev.id} className="bg-accent/10 border border-accent/20 p-2 rounded-lg mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-accent truncate max-w-[200px]" title={ev.summary}>{ev.summary}</span>
                          <span className="text-[10px] text-on-surface-variant">{format(new Date(ev.start.dateTime), 'ha')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Scheduled Tasks</p>
                <p className="text-lg font-black text-on-surface">{upcomingTasks.length} Upcoming</p>
              </div>
            </div>
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-on-surface-variant" />
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Completed (Month)</p>
                <p className="text-lg font-black text-on-surface">{completedThisMonth} / {totalThisMonth}</p>
              </div>
            </div>
            <div className="bg-on-surface p-4 rounded-xl border border-surface-container flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-background" />
              </div>
              <div>
                <p className="text-[10px] font-black text-background/70 uppercase tracking-wider">Completion Rate</p>
                <p className="text-lg font-black text-background">{monthCompletionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-on-surface">Upcoming Schedule</h3>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 max-h-[600px] no-scrollbar">
              <AnimatePresence>
                {upcomingTasks.length === 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-on-surface-variant text-center py-4">
                    No upcoming tasks right now. Try adding one to the calendar!
                  </motion.p>
                )}
                {upcomingTasks.map(ev => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={ev.id} 
                    className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm hover:border-primary transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className={cn(
                         "text-[10px] font-bold uppercase tracking-wider",
                         isSameDay(parseISO(ev.date!), new Date()) ? "text-primary" : "text-on-surface-variant"
                       )}>
                         {isSameDay(parseISO(ev.date!), new Date()) ? 'Today' : format(parseISO(ev.date!), 'MMM do')}
                       </span>
                       <button 
                         onClick={async (e) => {
                           e.stopPropagation();
                           const confirm = await showConfirm("Delete this task?");
                           if (confirm) deleteTask(ev.id);
                         }}
                         className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-red-500"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => updateTask(ev.id, { completed: !ev.completed })}
                        className={cn(
                          "w-5 h-5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors",
                          ev.completed ? "bg-primary border-primary text-on-primary" : "border-outline-variant hover:border-primary"
                        )}
                      >
                       {ev.completed && <CheckCircle className="w-3 h-3" />}
                      </button>
                      <h4 className="text-sm font-bold text-on-surface">{ev.title}</h4>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
