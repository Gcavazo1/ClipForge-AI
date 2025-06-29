import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from '../error-handling/error-boundary';

// Loading component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent mx-auto mb-2" />
      <p className="text-sm text-foreground-muted">{message}</p>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center p-4">
      <div className="text-error-500 mb-2">Failed to load component</div>
      <button 
        onClick={() => window.location.reload()} 
        className="text-sm text-primary-400 hover:text-primary-500"
      >
        Retry
      </button>
    </div>
  </div>
);

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  loadingMessage?: string
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: P) {
    return (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

// Preload function for critical routes
export function preloadComponent(importFunc: () => Promise<any>): void {
  // Preload on idle or after a delay
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFunc().catch(() => {
        // Ignore preload errors
      });
    });
  } else {
    setTimeout(() => {
      importFunc().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }
}

// Lazy load components with retry logic
export function createLazyComponent<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: {
    loadingMessage?: string;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  let retryCount = 0;
  
  const retryableImport = async (): Promise<{ default: ComponentType<P> }> => {
    try {
      return await importFunc();
    } catch (error) {
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        return retryableImport();
      }
      throw error;
    }
  };

  return withLazyLoading(retryableImport, options.loadingMessage);
}

// Intersection Observer for lazy loading content
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, callback]);
}