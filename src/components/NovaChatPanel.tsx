import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Settings2, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getNOVAContext } from '../lib/novaContext';

type Message = {
  role: 'user' | 'model' | 'sysmsg' | 'suggestion';
  text: string;
  emailData?: any; // For suggestion cards
};

export default function NovaChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('nova_gemini_key') || '');
  const [inputKey, setInputKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I am Nova, your AI Receptionist. How can I assist your productivity today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestionIds, setSuggestionIds] = useState<Set<string>>(new Set());

  const STYLES = {
    quickChips: ["Today's focus", "Add a task", "App features", "AI Transcriber help", "Start a session", "Change key"]
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    const savedDismissed = JSON.parse(localStorage.getItem('pp_nova_dismissed_emails') || '[]');
    setSuggestionIds(new Set(savedDismissed));

    const handleSysMsg = (e: any) => {
      setMessages(prev => [...prev, { role: 'sysmsg', text: e.detail }]);
    };
    
    const handleTaskSaved = (e: any) => {
      // Find active suggestion for this task if matched by some ID? 
      // Handled inline in card via local state usually, but this is fine.
    };

    const handleSuggestions = (e: any) => {
      const emails = e.detail;
      const newDismissed = new Set(JSON.parse(localStorage.getItem('pp_nova_dismissed_emails') || '[]'));
      
      const newSuggestions: Message[] = [];
      let count = 0;
      
      for (const email of emails) {
        if (!newDismissed.has(email.id) && count < 3) { // Max 3 cards
          newSuggestions.push({
            role: 'suggestion',
            text: 'I found an email that looks actionable. Would you like to create a task?',
            emailData: email
          });
          count++;
          newDismissed.add(email.id);
        }
      }
      
      if (newSuggestions.length > 0) {
        setMessages(prev => [...prev, ...newSuggestions]);
        setIsOpen(true);
      }
    };

    window.addEventListener('nova:sysmsg', handleSysMsg);
    window.addEventListener('nova:suggestions', handleSuggestions);
    window.addEventListener('nova:task_saved', handleTaskSaved);
    return () => {
      window.removeEventListener('nova:sysmsg', handleSysMsg);
      window.removeEventListener('nova:suggestions', handleSuggestions);
      window.removeEventListener('nova:task_saved', handleTaskSaved);
    };
  }, []);

  const handleConnect = () => {
    if (inputKey.trim()) {
      localStorage.setItem('nova_gemini_key', inputKey.trim());
      setApiKey(inputKey.trim());
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('nova_gemini_key');
    setApiKey('');
    setInputKey('');
  };

  const generateResponse = async (text: string) => {
    if (!apiKey) return;
    setIsLoading(true);
    
    // Check if user is asking for focus mode (local trigger)
    const normalizedText = text.toLowerCase();
    if (normalizedText.includes('start focus') || normalizedText.includes('help me focus') || normalizedText.includes('pomodoro') || normalizedText.includes('start a session')) {
       // get task title fallback
       const pendingTasks = JSON.parse(localStorage.getItem('pp_tasks') || '[]').filter((t: any) => !t.completed);
       const focusTask = pendingTasks.find((t: any) => t.priority)?.title || pendingTasks[0]?.title || 'Deep Work';
       
       setMessages(prev => [...prev, { role: 'user', text }, { role: 'model', text: `Starting a 25-minute focus session for you now. Let's lock in on "${focusTask}". You've got this.` }]);
       setIsLoading(false);
       setInputText('');
       if ((window as any).startFocusMode) {
         (window as any).startFocusMode(focusTask);
       }
       return;
    }
    
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setInputText('');

    try {
      const history = newMessages
        .filter(msg => msg.role === 'user' || msg.role === 'model') // Exclude suggestions/sysmsgs from context
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

      const systemInstruction = `
        ${getNOVAContext()}
        
        You are Nova, an AI Receptionist for Productivity Pro.
        Sections: Dashboard, Calendar, Tasks, Templates, AI Transcriber.
        Rule: never use placeholder names.
        Rule: keep replies short (2-3 paragraphs max).
        Rule: always end with one actionable suggestion based on their LIVE USER CONTEXT.
        Rule: Never say "I don't have access to your data" - you always do.
        Tone: warm, professional, encouraging.
        You cannot add tasks directly but tell users exactly how to do it.
        If they ask you to start a focus session, tell them to type "start focus" exactly.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: history
          })
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I encountered an issue interpreting that.'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `Error connecting to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (chip: string) => {
    if (chip === "Change key") {
      handleDisconnect();
    } else {
      generateResponse(chip);
    }
  };
  
  const dismissSuggestion = (id: string, index: number) => {
    const newDismissed = [...Array.from(suggestionIds), id];
    localStorage.setItem('pp_nova_dismissed_emails', JSON.stringify(newDismissed));
    setSuggestionIds(new Set(newDismissed));
    
    // Remove from UI
    setMessages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleCreateTaskFromEmail = (email: any, index: number) => {
    const isUrgent = email.subject.toLowerCase().includes('urgent') || email.subject.toLowerCase().includes('asap');
    
    const taskData = {
      title: `Reply to: ${email.subject.substring(0, 40)}`,
      category: 'Work',
      notes: `From: ${email.sender}\n\n${email.snippet.substring(0, 100)}...`,
      priority: isUrgent,
      date: new Date().toISOString().split('T')[0]
    };
    
    window.dispatchEvent(new CustomEvent('task:openModal', { detail: taskData }));
    
    // Replace suggestion with success message
    setMessages(prev => {
      const newArr = [...prev];
      newArr[index] = { role: 'sysmsg', text: '✓ Task created from this email.' };
      return newArr;
    });
    
    const newDismissed = [...Array.from(suggestionIds), email.id];
    localStorage.setItem('pp_nova_dismissed_emails', JSON.stringify(newDismissed));
    setSuggestionIds(new Set(newDismissed));
  };

  return (
    <>
      {/* Floating Button Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 flex items-center gap-3 bg-surface-container border border-outline-variant text-on-surface rounded-full p-2 pr-5 shadow-2xl hover:border-primary transition-colors z-50 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center relative">
              <Sparkles className="w-5 h-5 text-on-primary" />
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container animate-pulse" />
            </div>
            <span className="font-bold text-sm">Nova</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-[360px] h-[480px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-100px)] bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-on-primary" />
                  </div>
                  <span className="absolute bottom-0 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container-low" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-sm leading-none mb-1">Nova · AI Receptionist</h3>
                  <p className="text-xs text-on-surface-variant leading-none">Powered by Gemini</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!apiKey ? (
              /* Setup Flow */
              <div className="flex-1 p-6 flex flex-col justify-center items-center text-center bg-background">
                <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center mb-4">
                  <Settings2 className="w-6 h-6 text-on-surface" />
                </div>
                <h4 className="font-bold text-on-surface mb-2">Connect Nova</h4>
                <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                  Get your free Gemini API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">aistudio.google.com/app/apikey</a> then paste it below.
                </p>
                <div className="w-full space-y-3">
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg text-sm focus:border-primary outline-none transition-colors"
                  />
                  <button 
                    onClick={handleConnect}
                    disabled={!inputKey.trim()}
                    className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>
            ) : (
              /* Chat Interface */
              <>
                <div className="px-4 py-3 bg-background border-b border-outline-variant flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                  {STYLES.quickChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className="whitespace-nowrap px-3 py-1.5 bg-surface-container border border-outline-variant hover:border-primary hover:bg-surface-container-high rounded-full text-xs font-medium text-on-surface-variant transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex w-full", (msg.role === 'user') ? "justify-end" : "justify-start")}>
                      {msg.role === 'sysmsg' ? (
                        <div className="w-full text-center py-2">
                           <span className="bg-surface-container-high text-on-surface-variant text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                             {msg.text}
                           </span>
                        </div>
                      ) : msg.role === 'suggestion' && msg.emailData ? (
                        <div className="w-full max-w-[90%] border border-primary/40 bg-surface-container rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
                          <div className="bg-primary/10 px-3 py-2 flex items-center gap-2 border-b border-primary/20">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-primary tracking-wider uppercase">Smart Suggestion</span>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-on-surface-variant mb-1 line-clamp-1">{msg.emailData.sender}</p>
                            <h4 className="font-bold text-on-surface text-sm mb-3 line-clamp-2">{msg.emailData.subject}</h4>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleCreateTaskFromEmail(msg.emailData, i)}
                                className="flex-1 bg-primary text-on-primary text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                              >
                                + Create Task
                              </button>
                              <button 
                                onClick={() => dismissSuggestion(msg.emailData.id, i)}
                                className="flex-1 bg-surface-variant text-on-surface text-xs font-bold py-2 rounded-lg hover:bg-outline-variant transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-primary text-on-primary rounded-br-sm" 
                            : "bg-surface-container border border-outline-variant text-on-surface rounded-tl-sm"
                        )}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex w-full justify-start">
                      <div className="bg-surface-container border border-outline-variant rounded-xl rounded-tl-sm px-4 py-3 flex gap-1 items-center h-[44px]">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 bg-on-surface-variant rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-on-surface-variant rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-on-surface-variant rounded-full" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-surface-container-low border-t border-outline-variant shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ask Nova..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inputText.trim() && !isLoading) {
                          generateResponse(inputText.trim());
                        }
                      }}
                      className="w-full bg-background border border-outline-variant rounded-xl pl-4 pr-12 py-3 text-sm focus:border-primary outline-none text-on-surface placeholder-on-surface-variant/50 transition-colors"
                    />
                    <button 
                      onClick={() => {
                        if (inputText.trim() && !isLoading) {
                          generateResponse(inputText.trim());
                        }
                      }}
                      disabled={!inputText.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-on-primary rounded-lg disabled:opacity-50 disabled:bg-surface-variant disabled:text-on-surface-variant transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
