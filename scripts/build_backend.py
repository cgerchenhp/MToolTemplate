#!/usr/bin/env python3
"""
Build the Python backend as a Tauri sidecar executable.

Platform strategy
-----------------
- Windows  : --onedir with ``--contents-directory .``. PyInstaller writes
             backend.exe and all support files into one directory, which is
             staged as the portable release's ``_internal/`` directory.
- macOS    : --onedir with PyInstaller's normal ``_internal/`` directory.
             The sidecar remains in Contents/MacOS/ and support files are
             copied into Contents/Frameworks/ by the post-bundle step.

Usage
-----
Direct:
    python scripts/build_backend.py

Via npm (preferred):
    npm run build:backend
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
BIN_DIR = REPO_ROOT / "src-tauri" / "binaries"
SCRIPTS_DIR = Path(__file__).resolve().parent

# Where the staged _internal/ directory lives (picked up by tauri.conf.json resources)
INTERNAL_STAGE_DIR = BIN_DIR / "backend-_internal"

_RUNTIME_NOISE_NAMES = {"__pycache__"}
_RUNTIME_NOISE_SUFFIXES = (".pyc", ".pyo", ".orig", ".log", ".tmp")

# Homebrew prefixes to search for native libraries on macOS
_HOMEBREW_PREFIXES = ["/opt/homebrew", "/usr/local"]


def get_rust_target_triple() -> str:
    result = subprocess.run(
        ["rustc", "-vV"], capture_output=True, text=True, check=True,
    )
    for line in result.stdout.splitlines():
        if line.startswith("host:"):
            return line.split(":", 1)[1].strip()
    raise RuntimeError("Cannot determine Rust target triple from `rustc -vV`")


def _prune_runtime_noise(root: Path) -> None:
    """Remove source/build leftovers that are never runtime dependencies."""
    for item in sorted(root.rglob("*"), key=lambda path: len(path.parts), reverse=True):
        if item.name in _RUNTIME_NOISE_NAMES or item.suffix.lower() in _RUNTIME_NOISE_SUFFIXES:
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            elif item.is_file():
                item.unlink(missing_ok=True)








def build_sidecar() -> None:
    triple = get_rust_target_triple()
    print(f"[build_backend] Rust target triple: {triple}")

    BIN_DIR.mkdir(parents=True, exist_ok=True)

    dist_tmp = BIN_DIR / "_dist_tmp"
    build_tmp = BIN_DIR / "_build_tmp"
    spec_tmp  = BIN_DIR / "_spec_tmp"
    sep = os.pathsep
    # runtime_hook = SCRIPTS_DIR / "pyi_rth_cairocffi.py"

    # ------------------------------------------------------------------ #
    # Always use --onedir on every platform:                              #
    #  - macOS: avoids per-launch extraction to /tmp which triggers       #
    #    Gatekeeper OCSP network checks on every new _MEI* directory.     #
    #  - Windows: avoids ~1 s extraction to %TEMP% on every launch.       #
    # Files are already on disk; the bootloader loads them directly.      #
    # ------------------------------------------------------------------ #

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onedir",
        "--name", "backend",
        "--distpath", str(dist_tmp),
        "--workpath", str(build_tmp),
        "--specpath", str(spec_tmp),
        "--add-data", f"{BACKEND_DIR / 'core'}{sep}core",
        "--add-data", f"{BACKEND_DIR / 'routers'}{sep}routers",
        "--add-data", f"{REPO_ROOT / 'project.config.json'}{sep}.",
        # "--runtime-hook", str(runtime_hook),
        "main.py",
    ]

    # Keep backend.exe and its Python runtime together inside _internal/.
    if sys.platform == "win32":
        cmd.insert(cmd.index("main.py"), "--contents-directory")
        cmd.insert(cmd.index("main.py"), ".")


    print("[build_backend] Running PyInstaller…")
    subprocess.run(cmd, cwd=BACKEND_DIR, check=True)

    # --onedir output:
    #   Windows (--contents-directory .): dist_tmp/backend/backend.exe + files
    #   macOS (default):                  dist_tmp/backend/backend + _internal/
    exe_suffix = ".exe" if sys.platform == "win32" else ""
    src_exe = dist_tmp / "backend" / f"backend{exe_suffix}"

    if not src_exe.exists():
        raise FileNotFoundError(f"PyInstaller onedir output not found: {src_exe}")

    if sys.platform == "win32":
        src_internal = dist_tmp / "backend"
    else:
        src_internal = dist_tmp / "backend" / "_internal"
        if not src_internal.exists():
            raise FileNotFoundError(f"PyInstaller runtime directory not found: {src_internal}")

    _prune_runtime_noise(src_internal)

    # macOS still uses Tauri externalBin; Windows starts _internal/backend.exe.
    if sys.platform != "win32":
        dest_name = f"backend-{triple}{exe_suffix}"
        dest = BIN_DIR / dest_name
        shutil.copy2(src_exe, dest)
        print(f"[build_backend] Sidecar written to: {dest}")
    else:
        legacy_sidecar = BIN_DIR / f"backend-{triple}{exe_suffix}"
        if legacy_sidecar.exists():
            legacy_sidecar.unlink()
            print(f"[build_backend] Removed legacy sidecar: {legacy_sidecar}")

    # Stage the runtime directory. On Windows this includes backend.exe.
    #    post_bundle.py copies these to the correct runtime location per platform:
    #      macOS  : Contents/Frameworks/ (flat) inside the .app bundle
    #      Windows: target/release/_internal/ (including backend.exe)
    if INTERNAL_STAGE_DIR.exists():
        shutil.rmtree(INTERNAL_STAGE_DIR)
    shutil.copytree(src_internal, INTERNAL_STAGE_DIR)
    print(f"[build_backend] _internal staged to: {INTERNAL_STAGE_DIR}")
    print(f"[build_backend]   ({sum(1 for _ in INTERNAL_STAGE_DIR.rglob('*'))} files)")

    # Cleanup temp artefacts
    for tmp in (dist_tmp, build_tmp, spec_tmp):
        shutil.rmtree(tmp, ignore_errors=True)

    print("[build_backend] Done.")


if __name__ == "__main__":
    build_sidecar()
