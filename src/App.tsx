// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/auth_context';
import PrivateRoute from './components/private_route';
import PublicRoute from './components/public_route';
import LoginComponent from './components/login_component';
import Dashboard from './components/dashboard';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Redireciona a rota raiz para login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rota pública - Login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginComponent />
              </PublicRoute>
            }
          />

          {/* Rota privada - Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Rota 404 - Redireciona para login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;