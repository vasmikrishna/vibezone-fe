import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './firebase/ProtectedRoute';
import VideoPage from './VideoPage';
import LoginPage from './page/Login/LoginPage';
import { AuthProvider } from './firebase/AuthContext';
import Dashboard from './page/dashboard/dashboard';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <VideoPage />
              </ProtectedRoute>
            }
          />
          {/* Redirect all undefined routes to `/login` */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
