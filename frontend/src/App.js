import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ChatUsers from './pages/ChatUsers';
import Chat from './pages/Chat';
import './App.css';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-ring"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Role-protected route wrapper
const RoleRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-ring"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public route: redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-ring"></div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <RoleRoute allowedRoles={['provider', 'customer']}>
            <ChatUsers />
          </RoleRoute>
        }
      />
      <Route
        path="/chat/:contactId"
        element={
          <RoleRoute allowedRoles={['provider', 'customer']}>
            <Chat />
          </RoleRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e1e2e',
              color: '#cdd6f4',
              border: '1px solid #313244',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: "'DM Sans', sans-serif"
            },
            success: { iconTheme: { primary: '#a6e3a1', secondary: '#1e1e2e' } },
            error: { iconTheme: { primary: '#f38ba8', secondary: '#1e1e2e' } }
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;