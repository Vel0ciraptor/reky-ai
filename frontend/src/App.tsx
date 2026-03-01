import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import SearchPage from './pages/SearchPage';
import PublishProperty from './pages/PublishProperty';
import ChatPage from './pages/ChatPage';
import RankingPage from './pages/RankingPage';
import ProfilePage from './pages/ProfilePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { agent, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-accent-orange" />
    </div>
  );
  if (!agent) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Navigate to="/search" replace />} />

      {/* Protected — agent pages */}
      <Route path="/search" element={
        <ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>
      } />
      <Route path="/publish" element={
        <ProtectedRoute><Layout><PublishProperty /></Layout></ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute><Layout><ChatPage /></Layout></ProtectedRoute>
      } />
      <Route path="/ranking" element={
        <ProtectedRoute><Layout><RankingPage /></Layout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
      } />
      <Route path="/property/:id" element={
        <ProtectedRoute><Layout><PropertyDetailPage /></Layout></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/search" replace />} />
    </Routes>
  );
}

export default App;
