import { useState } from 'react';
import { useTasks } from '../lib/useTasks';
import { Plus, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { showPrompt } from '../components/PromptModal';
import { TaskModal, TaskModalData } from '../components/TaskModal';

type FilterType = 'All' | 'Work' | 'Personal' | 'Important';

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<FilterType>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'Work') return t.category?.toLowerCase() === 'work';
    if (filter === 'Personal') return t.category?.toLowerCase() === 'personal';
    if (filter === 'Important') return t.priority;
    return true;
  });

  const handleSaveTask = (data: TaskModalData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-8">
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask || undefined}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">Tasks</h1>
        <button 
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {(['All', 'Work', 'Personal', 'Important'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
              filter === f 
                ? "bg-on-surface text-background shadow-md" 
                : "bg-surface-container border border-outline-variant text-on-surface-variant hover:border-outline-variant"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 text-center bg-surface-container border border-outline-variant rounded-xl"
            >
              <p className="text-on-surface-variant font-medium">No tasks here. Add your first one!</p>
            </motion.div>
          )}

          {filteredTasks.map(task => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={task.id}
              className={cn(
                "group flex items-center p-4 bg-surface-container border rounded-xl transition-all cursor-pointer hover:border-primary relative overflow-hidden",
                task.priority ? "border-l-4 border-l-primary border-outline-variant" : "border-outline-variant"
              )}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                  className={cn(
                  "font-semibold text-base mb-1 transition-all cursor-text",
                  task.completed ? "text-on-surface-variant line-through" : "text-on-surface hover:text-primary"
                )}>
                  {task.title}
                </h4>
                <div className="flex gap-3">
                  {task.priority && (
                    <span className="text-[10px] px-2 py-0.5 bg-error/20 text-error rounded-full font-bold uppercase tracking-wider">
                      Priority High
                    </span>
                  )}
                  {task.category && (
                    <span className="text-[10px] px-2 py-0.5 bg-surface-container-highest text-on-surface-variant rounded-full font-bold uppercase tracking-wider">
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

              {task.completed && (
                <motion.div 
                  layoutId={`strike-full-${task.id}`}
                  className="absolute inset-0 bg-surface-variant/10 pointer-events-none" 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
