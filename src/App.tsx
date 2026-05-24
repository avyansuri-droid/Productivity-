import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Templates from './pages/Templates';
import AITranscriber from './pages/AITranscriber';
import Settings from './pages/Settings';
import AuthProvider from './components/AuthProvider';
import { PromptModal } from './components/PromptModal';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="templates" element={<Templates />} />
            <Route path="transcriber" element={<AITranscriber />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <PromptModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
