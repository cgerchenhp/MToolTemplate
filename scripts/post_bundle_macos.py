#!/usr/bin/env python3
"""
macOS post-bundle step: copy PyInstaller --onedir _internal/ files into the
two places where the backend binary may be run from:

  1. .app bundle  → Contents/Frameworks/  (flat, PyInstaller's _MEIPASS for
                      binaries inside an .app bundle on macOS)
  2. raw release  → src-tauri/target/release/_internal/  (used when running
                      `target/release/app` directly, outside the .app bundle)

Run after `npm run tauri build` (or cargo tauri build).
"""

import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BIN_DIR = REPO_ROOT / "src-tauri" / "binaries"
INTERNAL_STAGE = BIN_DIR / "backend-_internal"
TAURI_CONFIG = REPO_ROOT / "src-tauri" / "tauri.conf.json"

with TAURI_CONFIG.open(encoding="utf-8") as config_file:
    PRODUCT_NAME = json.load(config_file)["productName"]

APP_BUNDLE = (
    REPO_ROOT
    / "src-tauri"
    / "target"
    / "release"
    / "bundle"
    / "macos"
    / f"{PRODUCT_NAME}.app"
)
# PyInstaller --onedir on macOS: when the executable is inside a .app bundle
# (Contents/MacOS/<exe>), the bootloader sets sys._MEIPASS = Contents/Frameworks.
# All _internal/* must be copied FLAT into Contents/Frameworks/.
DEST_FRAMEWORKS = APP_BUNDLE / "Contents" / "Frameworks"

# When running the raw `target/release/backend` (e.g. via `target/release/app`
# outside the .app), PyInstaller looks for _internal/ next to the binary.
DEST_RELEASE_INTERNAL = REPO_ROOT / "src-tauri" / "target" / "release" / "_internal"


def _copy_internal_flat(src: Path, dest: Path) -> int:
    """Copy each item in src/ into dest/ (flat, one level). Return file count."""
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


def main() -> None:
    if sys.platform != "darwin":
        print("[post_bundle_macos] Skipping (not macOS).")
        return

    if not INTERNAL_STAGE.exists():
        print(
            f"[post_bundle_macos] ERROR: staged _internal not found: {INTERNAL_STAGE}\n"
            "  Run `npm run build:backend` first."
        )
        sys.exit(1)

    # ── 1. .app bundle: flat into Contents/Frameworks/ ───────────────────────
    if APP_BUNDLE.exists():
        n = _copy_internal_flat(INTERNAL_STAGE, DEST_FRAMEWORKS)
        print(f"[post_bundle_macos] Bundle  → {DEST_FRAMEWORKS}  ({n} files)")
    else:
        print(f"[post_bundle_macos] .app not found, skipping bundle copy: {APP_BUNDLE}")

    # ── 2. Raw release binary: _internal/ next to backend ────────────────────
    n = _copy_internal_flat(INTERNAL_STAGE, DEST_RELEASE_INTERNAL)
    print(f"[post_bundle_macos] Release → {DEST_RELEASE_INTERNAL}  ({n} files)")

    print("[post_bundle_macos] Done.")


if __name__ == "__main__":
    main()

