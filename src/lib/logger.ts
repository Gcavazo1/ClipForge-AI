import { supabase } from './supabase';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  user_id?: string;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 100;

  private constructor() {
    window.addEventListener('unload', () => this.flushLogs());
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private async createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): Promise<LogEntry> {
    const userId = await this.getCurrentUser();
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      user_id: userId,
    };
  }

  private async persistLog(entry: LogEntry) {
    this.logBuffer.push(entry);

    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flushLogs();
    }
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    try {
      const { error } = await supabase
        .from('application_logs')
        .insert(this.logBuffer);

      if (error) {
        console.error('Failed to persist logs:', error);
      }

      this.logBuffer = [];
    } catch (error) {
      console.error('Error flushing logs:', error);
    }
  }

  async debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
    const entry = await this.createLogEntry('debug', message, context);
    await this.persistLog(entry);
  }

  async info(message: string, context?: Record<string, any>) {
    console.info(this.formatMessage('info', message, context));
    const entry = await this.createLogEntry('info', message, context);
    await this.persistLog(entry);
  }

  async warn(message: string, context?: Record<string, any>) {
    console.warn(this.formatMessage('warn', message, context));
    const entry = await this.createLogEntry('warn', message, context);
    await this.persistLog(entry);
  }

  async error(message: string, error?: Error, context?: Record<string, any>) {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    } : context;

    console.error(this.formatMessage('error', message, errorContext));
    const entry = await this.createLogEntry('error', message, errorContext);
    await this.persistLog(entry);
  }

  async performance(label: string, duration: number, context?: Record<string, any>) {
    const perfContext = {
      ...context,
      duration,
      unit: 'ms',
    };

    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', `Performance: ${label}`, perfContext));
    }

    const entry = await this.createLogEntry('debug', `Performance: ${label}`, perfContext);
    await this.persistLog(entry);
  }
}

export const logger = Logger.getInstance();

// Performance monitoring decorator
export function measurePerformance() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;

      await logger.performance(
        `${target.constructor.name}.${propertyKey}`,
        duration,
        { args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg) }
      );

      return result;
    };

    return descriptor;
  };
}