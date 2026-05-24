import { useState, useRef, useEffect, useContext } from 'react';
import { Mic, Play, MoreVertical } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuthContext } from '../components/AuthProvider';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { format } from 'date-fns';

type Transcription = {
  id: string;
  userId: string;
  tag: string;
  title: string;
  preview: string;
  date: string;
};

export default function AITranscriber() {
  const { user } = useContext(AuthContext);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveTag, setSaveTag] = useState('MEETING NOTES');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'transcriptions'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const trs: Transcription[] = [];
      snapshot.forEach(doc => trs.push({ id: doc.id, ...doc.data() } as Transcription));
      setTranscriptions(trs);
      localStorage.setItem('pp_trans', JSON.stringify(trs));
    }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/transcriptions`));
    return unsub;
  }, [user]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let localFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            localFinalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setFinalText(prev => prev + localFinalTranscript);
        setLiveText(interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (finalText.trim() || liveText.trim()) {
        setFinalText(prev => prev + liveText);
        setLiveText('');
        setShowSaveDialog(true);
      }
    } else {
      setFinalText('');
      setLiveText('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'transcriptions'), {
        userId: user.uid,
        title: saveTitle || 'Untitled Transcription',
        tag: saveTag,
        preview: finalText.slice(0, 150) + (finalText.length > 150 ? '...' : ''),
        date: format(new Date(), 'MMM dd, yyyy'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowSaveDialog(false);
      setFinalText('');
      setSaveTitle('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/transcriptions`);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-8 flex flex-col">
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-on-surface mb-2 tracking-tight">Voice-to-Text</h1>
        <p className="text-on-surface-variant text-lg">Capture your thoughts in real-time with AI transcription.</p>
      </section>

      <div className="bg-surface-container border border-outline-variant rounded-[2rem] p-12 flex flex-col items-center justify-center relative overflow-hidden mb-16">
        {/* Waveform Visualization */}
        <div className="flex items-end gap-1.5 h-32 mb-12">
          {[40, 65, 85, 55, 75, 95, 45, 60, 80, 50].map((h, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1 bg-on-surface rounded-sm transition-all duration-150", 
                isRecording ? "animate-pulse" : "opacity-30"
              )} 
              style={{ height: isRecording ? `${Math.max(20, h + Math.random() * 20 - 10)}%` : '10%' }} 
            />
          ))}
        </div>

        {/* Record Button */}
        <button 
          onClick={toggleRecording}
          className={cn(
            "relative w-24 h-24 flex items-center justify-center text-on-primary rounded-full shadow-2xl transition-all duration-300 z-10",
            isRecording ? "bg-error animate-pulse scale-105" : "bg-primary hover:scale-105 active:scale-95"
          )}
        >
          <Mic className={cn("w-10 h-10", isRecording ? "text-on-error-container" : "text-on-primary")} />
          <div className={cn("absolute inset-0 rounded-full border-4 scale-125 transition-colors", isRecording ? "border-error/20" : "border-", "animate-ping")} style={{ animationDuration: '3s' }}></div>
        </button>
        <div className="mt-8">
          <span className="font-bold text-xs text-on-surface-variant tracking-widest uppercase">
            {isRecording ? "TAP TO STOP" : "TAP TO RECORD"}
          </span>
        </div>
        
        {/* Live Text Area */}
        {(finalText || liveText) && !showSaveDialog && (
          <div className="mt-12 w-full max-w-2xl bg-surface-container-low p-6 rounded-xl border border-outline-variant max-h-48 overflow-y-auto">
            <p className="text-on-surface text-lg leading-relaxed">{finalText} <span className="opacity-60">{liveText}</span></p>
          </div>
        )}
      </div>

      {showSaveDialog && (
        <div className="mb-16 bg-surface-container-high border border-outline-variant rounded-[1.5rem] p-6 max-w-md mx-auto w-full shadow-2xl">
          <h3 className="font-bold text-on-surface mb-4">Save Transcription</h3>
          <input 
            type="text" 
            placeholder="Transcription Title..." 
            value={saveTitle} 
            onChange={(e) => setSaveTitle(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 rounded-xl mb-4 text-sm focus:border-primary outline-none transition-colors"
          />
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {["MEETING NOTES", "VOICE MEMO", "IDEATION"].map(t => (
              <button 
                key={t} 
                onClick={() => setSaveTag(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap",
                  saveTag === t ? "bg-primary text-on-primary" : "bg-surface-container border border-outline-variant text-on-surface-variant"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 font-bold text-sm text-on-surface-variant hover:text-on-surface">Cancel</button>
            <button onClick={handleSave} className="bg-primary text-on-primary px-4 py-2 font-bold text-sm rounded-lg hover:opacity-90">Save</button>
          </div>
        </div>
      )}

      {/* Transcriptions Grid */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">Recent Transcriptions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transcriptions.length === 0 && (
            <div className="col-span-full py-8 text-center text-on-surface-variant bg-surface-container border border-outline-variant rounded-xl">No transcriptions yet. Tap the mic to start.</div>
          )}
          {transcriptions.map((t) => (
            <div key={t.id} className="bg-surface-container border border-outline-variant rounded-[1.5rem] p-6 hover:border-primary transition-colors flex flex-col">
              <div className="mb-4">
                <span className="text-[10px] bg-surface-container-high px-2 py-1 rounded-full text-on-surface-variant mb-3 inline-block font-bold mt-1 tracking-wider">
                  {t.tag}
                </span>
                <h3 className="font-bold text-base text-on-surface truncate">{t.title}</h3>
              </div>
              <p className="text-on-surface-variant text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
                {t.preview}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant mt-auto">
                <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest rounded-full hover:bg-surface-variant transition-colors group">
                  <Play className="w-4 h-4 text-on-surface group-hover:text-primary transition-colors fill-current" />
                </button>
                <span className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
