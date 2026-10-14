import { useState } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { ToastViewport } from './components/common/Toast';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  if (isAuthenticated) {
    return <MainLayout />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {mode === 'login' ? (
        <LoginForm onSwitchToSignup={() => setMode('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setMode('login')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
        <ToastViewport />
      </ToastProvider>
    </AuthProvider>
  );
}
