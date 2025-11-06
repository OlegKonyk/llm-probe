/**
 * Simple Structured Logger
 *
 * Provides structured logging with log levels, timestamps, and context.
 * Uses JSON format for easy parsing by log aggregation tools.
 *
 * Log Levels:
 * - debug: Detailed debugging information (development only)
 * - info: General informational messages
 * - warn: Warning messages (something unexpected but handled)
 * - error: Error messages (something failed)
 *
 * Environment Variables:
 * - LOG_LEVEL: Minimum log level to output (default: info)
 * - NODE_ENV: If 'production', outputs JSON; otherwise human-readable
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  /**
   * Format log message
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();

    if (this.isProduction) {
      // JSON format for production (easy to parse by log tools)
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...context,
      });
    } else {
      // Human-readable format for development
      const levelEmoji = {
        debug: '🔍',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        error: '❌',
      };

      let formatted = `${levelEmoji[level]} [${level.toUpperCase()}] ${message}`;

      if (context && Object.keys(context).length > 0) {
        formatted += `\n  Context: ${JSON.stringify(context, null, 2)}`;
      }

      return formatted;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        ...(error instanceof Error
          ? {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack,
            }
          : { error }),
      };

      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    // Override logging methods to include parent context
    const originalDebug = child.debug.bind(child);
    const originalInfo = child.info.bind(child);
    const originalWarn = child.warn.bind(child);
    const originalError = child.error.bind(child);

    child.debug = (msg: string, ctx?: LogContext) =>
      originalDebug(msg, { ...context, ...ctx });
    child.info = (msg: string, ctx?: LogContext) =>
      originalInfo(msg, { ...context, ...ctx });
    child.warn = (msg: string, ctx?: LogContext) =>
      originalWarn(msg, { ...context, ...ctx });
    child.error = (msg: string, err?: Error | unknown, ctx?: LogContext) =>
      originalError(msg, err, { ...context, ...ctx });

    return child;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
