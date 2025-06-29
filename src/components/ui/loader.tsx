import React from 'react';
import { cn } from '../../lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  className,
  size = 'md',
  message,
  fullScreen = false
}) => {
  const containerClasses = cn(
    'flex flex-col items-center justify-center',
    fullScreen && 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50',
    !fullScreen && 'py-8',
    className
  );

  const loaderSizes = {
    sm: 'w-32 h-16',
    md: 'w-40 h-20',
    lg: 'w-56 h-28'
  };

  const barCount = 15;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={containerClasses}>
      <div className={cn('relative', loaderSizes[size])}>
        <div className="loader">
          {bars.map((i) => (
            <span key={i} className="animate-load" style={{ 
              animationDelay: `${(i * 0.1).toFixed(1)}s`,
              backgroundColor: '#8b5cf6' // Primary color
            }} />
          ))}
        </div>
      </div>
      {message && (
        <p className="mt-4 text-foreground-muted">{message}</p>
      )}
    </div>
  );
};

export default Loader;