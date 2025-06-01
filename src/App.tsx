import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProphecyPage from './pages/ProphecyPage';
import PricingPage from './pages/PricingPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="editor/:projectId?" element={<EditorPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="prophecy" element={<ProphecyPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404\" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}

export default App;