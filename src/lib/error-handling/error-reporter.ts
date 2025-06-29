import { logger } from '../logger';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fingerprint: string;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private reports: ErrorReport[] = [];
  private readonly MAX_REPORTS = 100;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  // Report an error with context
  report(
    error: Error,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    const reportId = this.generateReportId();
    const fingerprint = this.generateFingerprint(error, context);

    const report: ErrorReport = {
      id: reportId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: {
        ...context,
        url: context.url || window.location.href,
        userAgent: context.userAgent || navigator.userAgent,
        timestamp: context.timestamp || new Date().toISOString()
      },
      severity,
      fingerprint
    };

    this.reports.push(report);

    // Keep only recent reports
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports = this.reports.slice(-this.MAX_REPORTS);
    }

    // Log the error
    logger.error('Error reported', error, {
      reportId,
      severity,
      context,
      fingerprint
    });

    // In production, we could send to an external service
    if (import.meta.env.PROD) {
      this.sendToExternalService(report);
    }

    return reportId;
  }

  // Get error reports
  getReports(filters?: {
    severity?: ErrorReport['severity'];
    component?: string;
    limit?: number;
  }): ErrorReport[] {
    let filtered = this.reports;

    if (filters?.severity) {
      filtered = filtered.filter(r => r.severity === filters.severity);
    }

    if (filters?.component) {
      filtered = filtered.filter(r => r.context.component === filters.component);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => 
      new Date(b.context.timestamp!).getTime() - new Date(a.context.timestamp!).getTime()
    );
  }

  // Get error statistics
  getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const bySeverity = this.reports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byComponent = this.reports.reduce((acc, report) => {
      const component = report.context.component || 'unknown';
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = this.reports.filter(report => 
      new Date(report.context.timestamp!).getTime() > oneHourAgo
    ).length;

    return {
      total: this.reports.length,
      bySeverity,
      byComponent,
      recentErrors
    };
  }

  // Clear reports
  clearReports(): void {
    this.reports = [];
  }

  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error, context: ErrorContext): string {
    // Create a unique fingerprint for grouping similar errors
    const key = `${error.name}:${error.message}:${context.component || 'unknown'}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  private async sendToExternalService(report: ErrorReport): Promise<void> {
    try {
      // This is a placeholder for sending to an error tracking service
      // We're not using any external service by default
      console.log('Error report ready for external service', { reportId: report.id });
      
      // If you want to add a real error tracking service in the future,
      // you would implement the API call here
    } catch (error) {
      console.warn('Failed to send error report to external service', error);
    }
  }
}

export const errorReporter = ErrorReporter.getInstance();

// Global error handlers
export function setupGlobalErrorHandlers(): void {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorReporter.report(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      {
        component: 'global',
        action: 'unhandledrejection',
        metadata: { reason: event.reason }
      },
      'high'
    );
  });

  // Global JavaScript errors
  window.addEventListener('error', (event) => {
    errorReporter.report(
      new Error(event.message),
      {
        component: 'global',
        action: 'javascript-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      },
      'medium'
    );
  });

  // Resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      errorReporter.report(
        new Error(`Resource failed to load: ${(event.target as any)?.src || 'unknown'}`),
        {
          component: 'global',
          action: 'resource-error',
          metadata: {
            tagName: (event.target as any)?.tagName,
            src: (event.target as any)?.src
          }
        },
        'low'
      );
    }
  }, true);
}