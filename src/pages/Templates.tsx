import { useState, useContext, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuthContext } from '../components/AuthProvider';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { FileText, Plus, X } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
};

const BUILT_IN = [
  { id: 'b1', name: 'Meeting Notes', description: 'Standard structure for team syncs capturing action items.', isCustom: false },
  { id: 'b2', name: 'Daily Plan', description: 'Morning structure focusing on 3 major priorities.', isCustom: false },
  { id: 'b3', name: 'Project Brief', description: 'Outlines scope, timeline, and key stakeholders.', isCustom: false },
];

export default function Templates() {
  const { user } = useContext(AuthContext);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'templates'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const tmpl: Template[] = [];
      snapshot.forEach(doc => tmpl.push({ id: doc.id, ...doc.data() } as Template));
      setCustomTemplates(tmpl);
    }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/templates`));
    return unsub;
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'templates'), {
        userId: user.uid,
        name: newName,
        description: newDesc,
        isCustom: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowModal(false);
      setNewName('');
      setNewDesc('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/templates`);
    }
  };

  const allTemplates = [...BUILT_IN, ...customTemplates];

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">Templates</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-on-surface text-background px-4 py-2.5 rounded-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allTemplates.map(t => (
          <div key={t.id} className="bg-surface-container border border-outline-variant rounded-xl p-6 hover:border-primary transition-colors group cursor-pointer flex flex-col min-h-[200px] shadow-sm">
            <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center mb-6 border border-outline-variant shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-on-surface-variant group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-bold text-lg text-on-surface mb-2 leading-tight">{t.name}</h3>
            <p className="text-on-surface-variant text-sm flex-grow line-clamp-3">{t.description}</p>
            {t.isCustom && (
              <div className="mt-4 pt-4 border-t border-">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Custom</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-high border border-outline-variant rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-1 bg-surface-variant text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-on-surface mb-6">Create Template</h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-sm focus:border-primary outline-none transition-colors text-on-surface"
                  placeholder="e.g. Weekly Review"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-sm focus:border-primary outline-none transition-colors resize-none h-24 text-on-surface"
                  placeholder="What is this template for?"
                />
              </div>
            </div>
            <button 
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              Save Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
