import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui/toast';
import { performanceMonitor } from './lib/performance/performance-monitor';
import './index.css';

// Start performance monitoring
performanceMonitor.startTimer('app-initialization');

// Performance observer for Core Web Vitals
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        performanceMonitor.measure(
          'page-load',
          () => Promise.resolve(),
          {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstPaint: navEntry.responseEnd - navEntry.requestStart
          }
        );
      }
    });
  });
  
  observer.observe({ entryTypes: ['navigation'] });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);

// End app initialization timing
performanceMonitor.endTimer('app-initialization');