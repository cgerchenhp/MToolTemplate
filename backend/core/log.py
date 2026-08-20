"""
Logging configuration for the backend.

Usage
-----
Entry point (main.py):
    from core.log import init_logging, get_log_queue
    init_logging()

Any other module:
    import logging
    logger = logging.getLogger(__name__)

All loggers inherit the root handler automatically via Python's logger
hierarchy — no cross-module logger import needed.
"""

import logging
import queue as stdlib_queue

# ---------------------------------------------------------------------------
# Shared log queue — consumed by the SSE /api/logs/stream endpoint
# ---------------------------------------------------------------------------
_log_queue: stdlib_queue.Queue = stdlib_queue.Queue(maxsize=2000)

_LOG_FMT = "%(asctime)s [%(name)s] %(levelname)s - %(message)s"


class _QueueHandler(logging.Handler):
    """Put every log record into the queue for SSE consumption."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            stream = "stderr" if record.levelno >= logging.WARNING else "stdout"
            _log_queue.put_nowait({"stream": stream, "level": record.levelname, "text": msg})
        except stdlib_queue.Full:
            pass


def init_logging(level: int = logging.INFO) -> None:
    """
    Configure the root logger once at application startup.

    Call this exactly once, before any other module emits log records.
    Attaches both a StreamHandler (console) and the _QueueHandler (SSE feed)
    to the root logger so every child logger inherits them automatically.
    """
    root = logging.getLogger()
    root.setLevel(level)

    # Avoid adding duplicate handlers if called more than once (e.g. during tests)
    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, _QueueHandler)
               for h in root.handlers):
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter(_LOG_FMT))
        root.addHandler(sh)

    if not any(isinstance(h, _QueueHandler) for h in root.handlers):
        qh = _QueueHandler()
        qh.setFormatter(logging.Formatter(_LOG_FMT))
        root.addHandler(qh)

    # Suppress noisy third-party HTTP client logs (e.g. httpx polling Ollama)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_log_queue() -> stdlib_queue.Queue:
    """Return the shared log queue (used by the SSE endpoint in main.py)."""
    return _log_queue
