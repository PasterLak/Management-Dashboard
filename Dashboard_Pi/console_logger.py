"""
Console logging system - captures Flask logs and stdout/stderr
"""
import sys
import logging
import threading
from config import MAX_CONSOLE_LOGS

console_logs = []
console_log_lock = threading.Lock()


class ConsoleLogHandler(logging.Handler):
    """Captures Flask's log output for display in web UI"""
    
    def emit(self, record):
        try:
            msg = self.format(record)
            with console_log_lock:
                console_logs.append(msg)
                if len(console_logs) > MAX_CONSOLE_LOGS:
                    console_logs[:] = console_logs[-MAX_CONSOLE_LOGS:]
        except Exception:
            self.handleError(record)


class StdoutCapture:
    """Captures stdout/stderr (print statements, errors)"""
    
    def __init__(self, original):
        self.original = original
    
    def write(self, text):
        if text and text.strip():
            with console_log_lock:
                console_logs.append(text.rstrip())
                if len(console_logs) > MAX_CONSOLE_LOGS:
                    console_logs[:] = console_logs[-MAX_CONSOLE_LOGS:]
        self.original.write(text)
    
    def flush(self):
        self.original.flush()


def setup_console_logging(app):
    """Setup console logging for Flask app"""
    # Create and configure handler
    console_handler = ConsoleLogHandler()
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Add to Flask logger
    app.logger.addHandler(console_handler)
    
    # Capture stdout/stderr
    sys.stdout = StdoutCapture(sys.stdout)
    sys.stderr = StdoutCapture(sys.stderr)
    
    # Add startup message
    with console_log_lock:
        console_logs.append("=" * 60)
        console_logs.append("PineCone Management Dashboard - Flask Server Starting")
        console_logs.append("=" * 60)


def get_console_logs():
    """Get all console logs"""
    with console_log_lock:
        return list(console_logs)


def clear_console_logs():
    """Clear all console logs"""
    with console_log_lock:
        console_logs.clear()
