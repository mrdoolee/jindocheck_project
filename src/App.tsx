import { HashRouter, Routes, Route } from 'react-router-dom';
import Shell from '@/components/layout/Shell';
import HomePage from './pages/HomePage';
import ClassPage from './pages/ClassPage';
import SettingsPage from './pages/SettingsPage';
import TimetablePage from './pages/TimetablePage';

export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup/*" element={<SettingsPage />} />
          <Route path="/class/:classId/*" element={<ClassPage />} />
          <Route path="/timetable" element={<TimetablePage />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
