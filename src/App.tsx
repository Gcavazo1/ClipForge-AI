import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './lib/error-handling/error-boundary';
import { setupGlobalErrorHandlers } from './lib/error-handling/error-reporter';
import { withLazyLoading, preloadComponent } from './lib/performance/lazy-loading';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MagicMouse from './components/common/MagicMouse';
import CustomCursor from './components/common/CustomCursor';

// Lazy load pages for better performance
const HomePage = withLazyLoading(() => import('./pages/HomePage'), 'Loading home page...');
const DashboardPage = withLazyLoading(() => import('./pages/DashboardPage'), 'Loading dashboard...');
const EditorPage = withLazyLoading(() => import('./pages/EditorPage'), 'Loading editor...');
const AnalyticsPage = withLazyLoading(() => import('./pages/AnalyticsPage'), 'Loading analytics...');
const ProphecyPage = withLazyLoading(() => import('./pages/ProphecyPage'), 'Loading prophecy...');
const PricingPage = withLazyLoading(() => import('./pages/PricingPage'), 'Loading pricing...');
const SettingsPage = withLazyLoading(() => import('./pages/SettingsPage'), 'Loading settings...');
const SignInPage = withLazyLoading(() => import('./pages/SignInPage'), 'Loading sign in...');
const SignUpPage = withLazyLoading(() => import('./pages/SignUpPage'), 'Loading sign up...');
const ResetPasswordPage = withLazyLoading(() => import('./pages/ResetPasswordPage'), 'Loading reset password...');
const CheckoutSuccessPage = withLazyLoading(() => import('./pages/CheckoutSuccessPage'));
const CheckoutCancelPage = withLazyLoading(() => import('./pages/CheckoutCancelPage'));
const NotFoundPage = withLazyLoading(() => import('./pages/NotFoundPage'));

// Create optimized query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Preload critical routes
if (typeof window !== 'undefined') {
  // Preload dashboard and editor for authenticated users
  preloadComponent(() => import('./pages/DashboardPage'));
  preloadComponent(() => import('./pages/EditorPage'));
}

function AppContent() {
  // Initialize auth state
  useAuth();

  return (
    <>
      <div id="magic-mouse-container">
        <MagicMouse />
      </div>
      <CustomCursor />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="pricing" element={<PricingPage />} />
        </Route>

        {/* Auth routes (redirect if already authenticated) */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="editor/:projectId?" element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          } />
          <Route path="analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="prophecy" element={
            <ProtectedRoute>
              <ProphecyPage />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="checkout/success" element={
            <ProtectedRoute>
              <CheckoutSuccessPage />
            </ProtectedRoute>
          } />
          <Route path="checkout/cancel" element={
            <ProtectedRoute>
              <CheckoutCancelPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch all routes */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
}

function App() {
  React.useEffect(() => {
    // Setup global error handlers
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;