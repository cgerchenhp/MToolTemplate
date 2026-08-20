"""Runtime configuration shared by source and packaged backend launches."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


DEFAULT_BACKEND_PORT = 7090
BACKEND_PORT_ENV = "TAURI_BACKEND_PORT"
PROJECT_CONFIG_ENV = "TAURI_PROJECT_CONFIG"


def _validated_port(value: Any, source: str) -> int:
    if isinstance(value, bool):
        raise RuntimeError(f"{source} must be an integer between 1024 and 65535")
    try:
        port = int(value)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(f"{source} must be an integer between 1024 and 65535") from exc
    if port < 1024 or port > 65535:
        raise RuntimeError(f"{source} must be an integer between 1024 and 65535")
    return port


def _project_config_candidates() -> list[Path]:
    candidates: list[Path] = []
    override = os.environ.get(PROJECT_CONFIG_ENV, "").strip()
    if override:
        candidates.append(Path(override).expanduser())

    bundle_root = getattr(sys, "_MEIPASS", None)
    if bundle_root:
        candidates.append(Path(bundle_root) / "project.config.json")

    module_root = Path(__file__).resolve().parents[2]
    candidates.append(module_root / "project.config.json")

    executable_dir = Path(sys.executable).resolve().parent
    candidates.extend(
        (
            executable_dir / "project.config.json",
            executable_dir.parent / "project.config.json",
        )
    )
    return list(dict.fromkeys(path.resolve() for path in candidates))


def configured_backend_port() -> int:
    """Return the preferred loopback port from the environment or project config."""
    environment_value = os.environ.get(BACKEND_PORT_ENV, "").strip()
    if environment_value:
        return _validated_port(environment_value, BACKEND_PORT_ENV)

    for path in _project_config_candidates():
        if not path.is_file():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Unable to read backend port from {path}: {exc}") from exc
        if "backendPort" in payload:
            return _validated_port(payload["backendPort"], f"{path}: backendPort")

    return DEFAULT_BACKEND_PORT
