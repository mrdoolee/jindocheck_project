import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import ClassPage from './pages/ClassPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/class/:classId/*" element={<ClassPage />} />
      </Routes>
    </HashRouter>
  );
}
