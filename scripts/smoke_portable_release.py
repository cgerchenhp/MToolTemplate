#!/usr/bin/env python3
"""Smoke-test the packaged backend inside a staged Portable release."""

from __future__ import annotations

import argparse
import ctypes
import json
import queue
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RELEASE = REPO_ROOT / "src-tauri" / "target" / "release-portable"


class _BasicLimitInformation(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong),
        ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", ctypes.c_uint32),
        ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t),
        ("ActiveProcessLimit", ctypes.c_uint32),
        ("Affinity", ctypes.c_size_t),
        ("PriorityClass", ctypes.c_uint32),
        ("SchedulingClass", ctypes.c_uint32),
    ]


class _IoCounters(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ctypes.c_uint64),
        ("WriteOperationCount", ctypes.c_uint64),
        ("OtherOperationCount", ctypes.c_uint64),
        ("ReadTransferCount", ctypes.c_uint64),
        ("WriteTransferCount", ctypes.c_uint64),
        ("OtherTransferCount", ctypes.c_uint64),
    ]


class _ExtendedLimitInformation(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", _BasicLimitInformation),
        ("IoInfo", _IoCounters),
        ("ProcessMemoryLimit", ctypes.c_size_t),
        ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t),
        ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]


class _WindowsProcessJob:
    """Own the smoke backend process tree so no packaged child can leak."""

    _KILL_ON_JOB_CLOSE = 0x2000
    _EXTENDED_LIMIT_INFORMATION = 9

    def __init__(self, process: subprocess.Popen[str]):
        self.handle = None
        if sys.platform != "win32":
            return
        kernel32 = ctypes.windll.kernel32
        kernel32.CreateJobObjectW.restype = ctypes.c_void_p
        kernel32.AssignProcessToJobObject.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
        kernel32.SetInformationJobObject.argtypes = [
            ctypes.c_void_p,
            ctypes.c_int,
            ctypes.c_void_p,
            ctypes.c_uint32,
        ]
        handle = kernel32.CreateJobObjectW(None, None)
        if not handle:
            return
        info = _ExtendedLimitInformation()
        info.BasicLimitInformation.LimitFlags = self._KILL_ON_JOB_CLOSE
        configured = kernel32.SetInformationJobObject(
            handle,
            self._EXTENDED_LIMIT_INFORMATION,
            ctypes.byref(info),
            ctypes.sizeof(info),
        )
        assigned = configured and kernel32.AssignProcessToJobObject(
            handle,
            ctypes.c_void_p(process._handle),
        )
        if assigned:
            self.handle = handle
        else:
            kernel32.CloseHandle(handle)

    def close(self) -> None:
        if self.handle:
            kernel32 = ctypes.windll.kernel32
            kernel32.TerminateJobObject(self.handle, 1)
            kernel32.CloseHandle(self.handle)
            self.handle = None


def _request(url: str, *, timeout: float = 5) -> Any:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _read_lines(process: subprocess.Popen[str], output: queue.Queue[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        output.put(line.rstrip())


def _read_manifest(release_dir: Path) -> dict[str, Any]:
    path = release_dir / "release-manifest.json"
    if not path.is_file():
        raise FileNotFoundError(f"Portable release manifest not found: {path}")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != "mtool-portable-release-v1":
        raise RuntimeError(f"Unsupported Portable release manifest: {path}")
    return manifest


def _stop_backend(process: subprocess.Popen[str]) -> bool:
    graceful = False
    if process.poll() is None and process.stdin is not None:
        try:
            process.stdin.write("shutdown\n")
            process.stdin.flush()
            process.stdin.close()
            process.wait(timeout=10)
            graceful = True
        except (BrokenPipeError, OSError, subprocess.TimeoutExpired):
            pass
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    return graceful


def smoke(release_dir: Path) -> dict[str, Any]:
    release_dir = release_dir.resolve()
    manifest = _read_manifest(release_dir)
    backend = release_dir / Path(str(manifest["backend"]))
    if not backend.is_file():
        raise FileNotFoundError(f"Portable backend not found: {backend}")

    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    process = subprocess.Popen(
        [str(backend)],
        cwd=backend.parent if sys.platform == "darwin" else release_dir,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=creationflags,
    )
    process_job = _WindowsProcessJob(process)
    output: queue.Queue[str] = queue.Queue()
    threading.Thread(target=_read_lines, args=(process, output), daemon=True).start()
    transcript: list[str] = []
    summary: dict[str, Any] | None = None
    try:
        port: int | None = None
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline and process.poll() is None:
            try:
                line = output.get(timeout=0.25)
            except queue.Empty:
                continue
            transcript.append(line)
            if line.startswith("BACKEND_PORT:"):
                port = int(line.partition(":")[2].strip())
                break
        if port is None:
            raise RuntimeError(
                "Portable backend did not announce a port:\n" + "\n".join(transcript)
            )

        base_url = f"http://127.0.0.1:{port}"
        health_deadline = time.monotonic() + 30
        while True:
            try:
                hello = _request(f"{base_url}/api/hello")
                break
            except (OSError, urllib.error.URLError, json.JSONDecodeError):
                if time.monotonic() >= health_deadline:
                    raise
                time.sleep(0.2)
        if not str(hello.get("message") or "").strip():
            raise RuntimeError(f"Portable hello endpoint returned an invalid response: {hello}")

        sysinfo = _request(f"{base_url}/api/sysinfo")
        if not all(str(sysinfo.get(key) or "").strip() for key in ("os", "python_version", "machine")):
            raise RuntimeError(f"Portable sysinfo endpoint returned an invalid response: {sysinfo}")

        summary = {
            "ok": True,
            "release_dir": str(release_dir),
            "backend": str(backend.relative_to(release_dir)),
            "port": port,
            "hello": hello["message"],
            "platform": sysinfo["os"],
            "python_version": sysinfo["python_version"],
        }
    finally:
        graceful_shutdown = _stop_backend(process)
        process_job.close()

    if summary is None:
        raise RuntimeError("Portable smoke test ended without a result")
    if not graceful_shutdown:
        raise RuntimeError("Portable backend did not honor the graceful shutdown command")
    summary["graceful_shutdown"] = True
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-dir", type=Path, default=DEFAULT_RELEASE)
    args = parser.parse_args()
    smoke(args.release_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
