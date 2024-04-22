"""
Simple Structured Logger

Provides structured logging with log levels, timestamps, and context.
Uses JSON format for easy parsing by log aggregation tools.

Log Levels:
- debug: Detailed debugging information (development only)
- info: General informational messages
- warn: Warning messages (something unexpected but handled)
- error: Error messages (something failed)

Environment Variables:
- LOG_LEVEL: Minimum log level to output (default: info)
- PYTHON_ENV: If 'production', outputs JSON; otherwise human-readable
"""

import json
import os
import sys
from datetime import datetime
from typing import Any, Optional


class Logger:
    """Structured logger with level-based filtering and JSON output"""

    LEVELS = {
        'debug': 0,
        'info': 1,
        'warn': 2,
        'error': 3
    }

    LEVEL_EMOJIS = {
        'debug': '🔍',
        'info': 'ℹ️ ',
        'warn': '⚠️ ',
        'error': '❌'
    }

    def __init__(self, context: Optional[dict[str, Any]] = None):
        """
        Create a new logger instance

        Args:
            context: Optional context to include in all log messages
        """
        self.min_level = os.getenv('LOG_LEVEL', 'info').lower()
        self.is_production = os.getenv('PYTHON_ENV') == 'production'
        self.context = context or {}

    def _should_log(self, level: str) -> bool:
        """Check if a log level should be output"""
        return self.LEVELS[level] >= self.LEVELS.get(self.min_level, 1)

    def _format_message(
        self,
        level: str,
        message: str,
        context: Optional[dict[str, Any]] = None
    ) -> str:
        """Format log message based on environment"""
        timestamp = datetime.utcnow().isoformat() + 'Z'
        merged_context = {**self.context, **(context or {})}

        if self.is_production:
            # JSON format for production (easy to parse by log tools)
            log_data = {
                'timestamp': timestamp,
                'level': level,
                'message': message,
                **merged_context
            }
            return json.dumps(log_data)
        else:
            # Human-readable format for development
            formatted = f"{self.LEVEL_EMOJIS[level]} [{level.upper()}] {message}"

            if merged_context:
                formatted += f"\n  Context: {json.dumps(merged_context, indent=2)}"

            return formatted

    def debug(self, message: str, context: Optional[dict[str, Any]] = None) -> None:
        """Log debug message"""
        if self._should_log('debug'):
            print(self._format_message('debug', message, context), file=sys.stdout)

    def info(self, message: str, context: Optional[dict[str, Any]] = None) -> None:
        """Log info message"""
        if self._should_log('info'):
            print(self._format_message('info', message, context), file=sys.stdout)

    def warn(self, message: str, context: Optional[dict[str, Any]] = None) -> None:
        """Log warning message"""
        if self._should_log('warn'):
            print(self._format_message('warn', message, context), file=sys.stderr)

    def error(
        self,
        message: str,
        error: Optional[Exception] = None,
        context: Optional[dict[str, Any]] = None
    ) -> None:
        """Log error message with optional exception details"""
        if self._should_log('error'):
            error_context = context.copy() if context else {}

            if error:
                error_context['errorName'] = type(error).__name__
                error_context['errorMessage'] = str(error)
                if hasattr(error, '__traceback__') and error.__traceback__:
                    import traceback
                    error_context['errorStack'] = ''.join(
                        traceback.format_tb(error.__traceback__)
                    )

            print(self._format_message('error', message, error_context), file=sys.stderr)

    def child(self, context: dict[str, Any]) -> 'Logger':
        """
        Create child logger with additional context

        Args:
            context: Additional context to merge with parent context

        Returns:
            New logger instance with merged context
        """
        merged_context = {**self.context, **context}
        return Logger(context=merged_context)


# Export singleton instance
logger = Logger()
