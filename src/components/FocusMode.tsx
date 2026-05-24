import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, Play, SkipForward, X, Volume2, VolumeX } from 'lucide-react';

export default function FocusMode({ 
  isOpen, 
  taskTitle, 
  onClose,
  onComplete
}: { 
  isOpen: boolean; 
  taskTitle: string; 
  onClose: () => void;
  onComplete: (duration: number) => void;
}) {
  const [duration, setDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [isBreak, setIsBreak] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Sound setup
  useEffect(() => {
    if (soundEnabled && isActive) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!noiseNodeRef.current) {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.03;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        noiseNodeRef.current = whiteNoise;
        gainNodeRef.current = gainNode;
      } else {
        if (gainNodeRef.current) gainNodeRef.current.gain.value = 0.03;
      }
    } else {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }
    }

    return () => {
      // Don't fully destroy unless unmounting entirely or want to save resources
    };
  }, [soundEnabled, isActive]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch(e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playChime = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    
    const now = ctx.currentTime;
    
    // Simple 3 note chime
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(554.37, now + 0.2); // C#5
    osc.frequency.setValueAtTime(659.25, now + 0.4); // E5
    
    osc.start(now);
    osc.stop(now + 1.5);
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      if (!isBreak) {
        playChime();
        setIsActive(false);
      } else {
        playChime();
        setIsActive(false);
        setIsBreak(false);
        onClose();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setShowSetup(true);
      setIsActive(false);
      setIsBreak(false);
      setDuration(25 * 60);
      setTimeLeft(25 * 60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startSession = (mins: number) => {
    setDuration(mins * 60);
    setTimeLeft(mins * 60);
    setShowSetup(false);
    setIsActive(true);
  };

  const startBreak = () => {
    setIsBreak(true);
    setDuration(5 * 60);
    setTimeLeft(5 * 60);
    setIsActive(true);
    onComplete(duration / 60); // Log completion
  };

  const endSession = () => {
    if (!isBreak && !showSetup && timeLeft < duration) { // User started working
        // Maybe log partial time? Ignoring for now based on requirements
    }
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;
  const strokeDashoffset = 283 - (283 * progress) / 100;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-on-surface">
      <AnimatePresence mode="wait">
        {showSetup ? (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-md w-full"
          >
            <h1 className="text-3xl font-bold tracking-tight mb-2">Focus Mode</h1>
            <p className="text-on-surface-variant mb-8 text-lg">Target: {taskTitle || 'Deep Work'}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[15, 25, 45, 60].map(m => (
                <button
                  key={m}
                  onClick={() => startSession(m)}
                  className="py-4 bg-surface-container border border-outline-variant hover:border-primary rounded-2xl font-bold text-lg transition-colors hover:bg-surface-container-high shadow-sm"
                >
                  {m} Min
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-on-surface-variant font-bold text-sm hover:text-on-surface">
              Cancel
            </button>
          </motion.div>
        ) : timeLeft === 0 && !isBreak ? (
          <motion.div 
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <h2 className="text-4xl font-bold mb-4">Session complete! 🎉</h2>
            <p className="text-on-surface-variant text-lg mb-8">Great work on "{taskTitle || 'your task'}".</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={startBreak}
                className="py-4 px-6 bg-primary text-on-primary font-bold rounded-2xl text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl"
              >
                Take a Break (5 min)
              </button>
              <button 
                onClick={() => {
                  onComplete(duration / 60);
                  setShowSetup(true);
                }}
                className="py-4 px-6 bg-surface-container font-bold rounded-2xl text-lg hover:bg-surface-container-high transition-colors"
              >
                Start Another Session
              </button>
              <button onClick={onClose} className="text-on-surface-variant mt-4 font-bold text-sm hover:text-on-surface">
                Close Focus Mode
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="timer"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center max-w-lg w-full relative"
          >
            <h2 className="text-2xl font-bold mb-2 text-center break-words w-full h-[64px] line-clamp-2">
              {isBreak ? 'Rest your eyes. Step away from the screen.' : taskTitle}
            </h2>
            
            <div className="relative w-72 h-72 my-12 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="144" cy="144" r="140"
                  fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-surface-container-highest"
                />
                <circle
                  cx="144" cy="144" r="140"
                  fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray="880" // 2 * pi * 140 ~= 879.6
                  strokeDashoffset={283 /* Wait, I used 283 in the computation above, 2*pi*r here is different. Let's fix this inline */}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-linear"
                  style={{ strokeDasharray: 880, strokeDashoffset: 880 - (880 * progress) / 100 }}
                />
              </svg>
              <div className="text-7xl font-mono tracking-tighter font-medium text-on-surface">
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsActive(!isActive)}
                className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
              </button>
              <button 
                onClick={() => {
                   if(isBreak) {
                     setTimeLeft(0);
                   } else {
                     setTimeLeft(0);
                   }
                }}
                className="p-4 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface transition-colors"
                title="Skip"
              >
                <SkipForward className="w-6 h-6" />
              </button>
              <button 
                onClick={endSession}
                className="p-4 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface transition-colors"
                title="End Session"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!isBreak && (
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="absolute bottom-[-100px] right-0 p-3 rounded-full bg-surface-container-high hover:bg-surface-variant transition-colors text-on-surface-variant"
                title={soundEnabled ? "Disable ambient sound" : "Enable ambient sound"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
