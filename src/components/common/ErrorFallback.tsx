import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from '../ui/button';
import Loader from '../ui/loader';
import { errorReporter } from '../../lib/error-handling/error-reporter';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  componentName?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  componentName = 'Component' 
}) => {
  const [reportId, setReportId] = React.useState<string | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      const id = errorReporter.report(error, {
        component: componentName,
        action: 'component-error'
      }, 'medium');
      setReportId(id);
    }
  }, [error, componentName]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      resetError?.();
      setIsRetrying(false);
    }, 1000);
  };

  const handleReportBug = () => {
    // In a real app, this would open a bug report form
    const subject = encodeURIComponent(`Bug Report: ${componentName} Error`);
    const body = encodeURIComponent(`
Error: ${error?.message || 'Unknown error'}
Component: ${componentName}
Report ID: ${reportId}
URL: ${window.location.href}
Time: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
`);
    
    window.open(`mailto:support@clipforge.ai?subject=${subject}&body=${body}`);
  };

  if (isRetrying) {
    return <Loader message="Retrying..." />;
  }

  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-error-900/20 p-3 rounded-full">
            <AlertTriangle size={32} className="text-error-500" />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">
          {componentName} Error
        </h2>
        
        <p className="text-foreground-muted mb-6">
          Something went wrong while loading this component. 
          {reportId && ' The error has been reported to our team.'}
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium mb-2 text-error-400">
              Error Details (Development)
            </summary>
            <div className="bg-background p-3 rounded text-xs font-mono overflow-auto max-h-32 text-left">
              <div className="text-error-400 mb-1">
                {error.name}: {error.message}
              </div>
              <div className="text-foreground-muted whitespace-pre-wrap text-xs">
                {error.stack?.split('\n').slice(0, 5).join('\n')}
              </div>
            </div>
          </details>
        )}

        <div className="space-y-3">
          {resetError && (
            <Button
              variant="primary"
              onClick={handleRetry}
              className="w-full"
              icon={<RefreshCw size={16} />}
            >
              Try Again
            </Button>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
              icon={<Home size={16} />}
            >
              Go Home
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReportBug}
              className="flex-1"
              icon={<Bug size={16} />}
            >
              Report Bug
            </Button>
          </div>
        </div>

        {reportId && (
          <p className="text-xs text-foreground-muted mt-4">
            Error ID: {reportId}
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;