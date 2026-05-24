import { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AuthContext } from '../components/AuthProvider';
import { handleFirestoreError, OperationType } from './utils';

export type Task = {
  id: string;
  userId: string;
  title: string;
  category?: string;
  date?: string;
  time?: string;
  priority: boolean;
  completed: boolean;
  createdAt: any;
  updatedAt: any;
  notes?: string;
  sendReminder?: boolean;
  addToCalendar?: boolean;
};

export function useTasks() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'tasks'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const ts: Task[] = [];
      snapshot.forEach((doc) => {
        ts.push({ id: doc.id, ...doc.data() } as Task);
      });
      // Sort by creation time manually here or in query.
      ts.sort((a, b) => {
        const t1 = a.createdAt?.toMillis?.() || 0;
        const t2 = b.createdAt?.toMillis?.() || 0;
        return t2 - t1;
      });
      setTasks(ts);
      localStorage.setItem('pp_tasks', JSON.stringify(ts));
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/tasks`);
    });

    return unsub;
  }, [user]);

  const addTask = async (data: Partial<Task>) => {
    if (!user) return;
    try {
      const colRef = collection(db, 'users', user.uid, 'tasks');
      const docRef = await addDoc(colRef, {
        userId: user.uid,
        title: data.title || 'New Task',
        category: data.category || 'General',
        date: data.date || '',
        time: data.time || '',
        priority: !!data.priority,
        completed: false,
        notes: data.notes || '',
        sendReminder: !!data.sendReminder,
        addToCalendar: !!data.addToCalendar,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/tasks`);
      return null;
    }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'tasks', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'tasks', id);
      await deleteDoc(docRef);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/tasks/${id}`);
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
}
