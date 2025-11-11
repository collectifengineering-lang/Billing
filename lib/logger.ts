/**
 * Logging Service
 * Provides structured logging with different log levels
 * Replaces console.log statements with proper logging infrastructure
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.logLevel = envLogLevel
      ? (LogLevel[envLogLevel as keyof typeof LogLevel] ?? LogLevel.INFO)
      : this.isDevelopment
      ? LogLevel.DEBUG
      : LogLevel.INFO;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    if (this.isDevelopment) {
      console.info(this.formatMessage('INFO', message, context));
    } else {
      // In production, you might want to send to external logging service
      // For now, we'll use console.info but with structured format
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    console.warn(this.formatMessage('WARN', message, context));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    };
    
    console.error(this.formatMessage('ERROR', message, errorContext));
    
    // In production, you might want to send errors to error tracking service
    // Example: Sentry.captureException(error, { extra: errorContext });
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, context);
        break;
      case LogLevel.INFO:
        this.info(message, context);
        break;
      case LogLevel.WARN:
        this.warn(message, context);
        break;
      case LogLevel.ERROR:
        this.error(message, undefined, context);
        break;
    }
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Helper functions for common logging patterns
 */
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) =>
    logger.error(message, error, context),
};

/**
 * Create a scoped logger with default context
 */
export function createScopedLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...defaultContext, ...context }),
  };
}

/**
 * Performance logging helper
 */
export function logPerformance(operation: string, duration: number, context?: LogContext): void {
  if (duration > 1000) {
    logger.warn(`Slow operation: ${operation} took ${duration}ms`, context);
  } else {
    logger.debug(`Operation: ${operation} took ${duration}ms`, context);
  }
}

/**
 * API request logging helper
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
  logger.log(level, `API ${method} ${path} ${statusCode}`, {
    ...context,
    method,
    path,
    statusCode,
    duration,
  });
}

/**
 * Database operation logging helper
 */
export function logDatabaseOperation(
  operation: string,
  duration: number,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
  logger.log(level, `Database ${operation}`, {
    ...context,
    operation,
    duration,
    success,
  });
}
