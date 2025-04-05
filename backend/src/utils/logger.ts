const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

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
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();

    if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
      this.minLevel = envLevel as LogLevel;
    } else {
      this.minLevel = 'info';
      if (envLevel) {
        console.warn(`Invalid LOG_LEVEL "${envLevel}", falling back to "info"`);
      }
    }

    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();

    if (this.isProduction) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(context ?? {}),
      });
    } else {
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

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...(context ?? {}),
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
}

export const logger = new Logger();
export { Logger };
