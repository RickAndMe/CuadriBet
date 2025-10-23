import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Groups from './components/Groups';
import GroupDetail from './components/GroupDetail';
import BetDetail from './components/BetDetail';
import CreateBet from './components/CreateBet';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Navbar />}
        <main className={isAuthenticated ? 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8' : ''}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/register"
              element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />}
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/groups"
              element={isAuthenticated ? <Groups /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/group/:id"
              element={isAuthenticated ? <GroupDetail /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/bet/:id"
              element={isAuthenticated ? <BetDetail /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/create-bet"
              element={isAuthenticated ? <CreateBet /> : <Navigate to="/login" replace />}
            />

            {/* Default redirect */}
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
