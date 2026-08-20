#!/usr/bin/env python3
"""
Post-bundle step: place PyInstaller --onedir _internal/ files next to the
backend sidecar so the bootloader can find its dependencies at runtime.

Platform behaviour
------------------
macOS  : The .app bundle has a specific layout. PyInstaller's bootloader sets
         sys._MEIPASS = Contents/Frameworks/ when the executable is inside
         Contents/MacOS/. So _internal/* must be copied FLAT into
         Contents/Frameworks/.
         Additionally, _internal/ is placed next to the raw release binary
         for running the binary outside the .app during development.

Windows: The staged PyInstaller directory contains backend.exe and its support
         files. It is copied as target/release/_internal/ so the release has
         one self-contained backend directory.

Run after `tauri build` (i.e. `npm run tauri:build`).
"""

import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BIN_DIR = REPO_ROOT / "src-tauri" / "binaries"
INTERNAL_STAGE = BIN_DIR / "backend-_internal"

RELEASE_DIR = REPO_ROOT / "src-tauri" / "target" / "release"
TAURI_CONFIG = REPO_ROOT / "src-tauri" / "tauri.conf.json"

with TAURI_CONFIG.open(encoding="utf-8") as config_file:
    PRODUCT_NAME = json.load(config_file)["productName"]

APP_BUNDLE = (
    RELEASE_DIR
    / "bundle"
    / "macos"
    / f"{PRODUCT_NAME}.app"
)
# PyInstaller --onedir on macOS: when the executable is inside an .app bundle
# (Contents/MacOS/<exe>), the bootloader sets sys._MEIPASS = Contents/Frameworks.
# All _internal/* must be copied FLAT into Contents/Frameworks/.
DEST_FRAMEWORKS = APP_BUNDLE / "Contents" / "Frameworks"

# Common: _internal/ next to the raw release binary (for running outside the .app
# on macOS, and as the primary runtime location on Windows).
DEST_RELEASE_INTERNAL = RELEASE_DIR / "_internal"
DEST_RELEASE_BACKEND = RELEASE_DIR / "backend.exe"


def _copy_internal_flat(src: Path, dest: Path) -> int:
    """Copy each item in *src/* into *dest/* (one level, flat). Return file count."""
    dest.mkdir(parents=True, exist_ok=True)
    n = 0
    for src_item in src.iterdir():
        dest_item = dest / src_item.name
        if dest_item.exists():
            shutil.rmtree(dest_item) if dest_item.is_dir() else dest_item.unlink()
        if src_item.is_dir():
            shutil.copytree(src_item, dest_item)
            n += sum(1 for _ in dest_item.rglob("*"))
        else:
            shutil.copy2(src_item, dest_item)
            n += 1
    return n


def _copy_internal_tree(src: Path, dest: Path) -> int:
    """Replace *dest/* with a full copy of *src/*. Return file count."""
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest)
    return sum(1 for _ in dest.rglob("*"))


def main() -> None:
    if not INTERNAL_STAGE.exists():
        print(
            f"[post_bundle] ERROR: staged _internal not found: {INTERNAL_STAGE}\n"
            "  Run `npm run build:backend` first."
        )
        sys.exit(1)

    if sys.platform == "darwin":
        # ── 1. .app bundle: flat into Contents/Frameworks/ ───────────────────
        if APP_BUNDLE.exists():
            n = _copy_internal_flat(INTERNAL_STAGE, DEST_FRAMEWORKS)
            print(f"[post_bundle] macOS bundle  → {DEST_FRAMEWORKS}  ({n} files)")
        else:
            print(f"[post_bundle] .app not found, skipping bundle copy: {APP_BUNDLE}")

        # ── 2. Raw release binary: _internal/ next to backend ────────────────
        n = _copy_internal_flat(INTERNAL_STAGE, DEST_RELEASE_INTERNAL)
        print(f"[post_bundle] macOS release → {DEST_RELEASE_INTERNAL}  ({n} files)")

    elif sys.platform == "win32":
        staged_backend = INTERNAL_STAGE / "backend.exe"
        if not staged_backend.is_file():
            print(f"[post_bundle] ERROR: staged backend not found: {staged_backend}")
            sys.exit(1)
        n = _copy_internal_tree(INTERNAL_STAGE, DEST_RELEASE_INTERNAL)
        if DEST_RELEASE_BACKEND.exists():
            DEST_RELEASE_BACKEND.unlink()
            print(f"[post_bundle] Removed legacy root sidecar: {DEST_RELEASE_BACKEND}")
        print(f"[post_bundle] Windows → {DEST_RELEASE_INTERNAL}  ({n} files)")

    else:
        print(f"[post_bundle] Unsupported platform: {sys.platform}")
        sys.exit(1)

    print("[post_bundle] Done.")


if __name__ == "__main__":
    main()
