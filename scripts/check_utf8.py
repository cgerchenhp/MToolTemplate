#!/usr/bin/env python3
"""Validate UTF-8 source files and optionally report or remove UTF-8 BOMs.

Usage:
    python scripts/check_utf8.py
    python scripts/check_utf8.py --require-no-bom
    python scripts/check_utf8.py --fix-bom
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


TEXT_EXTENSIONS = {
    ".bat", ".c", ".cfg", ".cmd", ".cpp", ".cs", ".css", ".h", ".hpp",
    ".html", ".ini", ".js", ".json", ".jsx", ".md", ".mjs", ".ps1", ".py",
    ".rs", ".sh", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
}
SKIP_DIRECTORIES = {
    ".git", ".idea", ".pytest_cache", ".venv", ".vscode", "__pycache__", "dist",
    "dist-ssr", "logs", "node_modules", "target", "temp",
}
BOM = b"\xef\xbb\xbf"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate project text files are UTF-8.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--require-no-bom", action="store_true", help="fail when UTF-8 BOMs are found")
    parser.add_argument("--fix-bom", action="store_true", help="remove UTF-8 BOMs from scanned files")
    return parser.parse_args()


def iter_text_files(root: Path):
    for directory, directory_names, file_names in os.walk(root):
        current = Path(directory)
        directory_names[:] = [
            name for name in directory_names
            if name not in SKIP_DIRECTORIES and not name.startswith(".")
        ]
        if "src-tauri" in current.relative_to(root).parts and current.name == "binaries":
            directory_names[:] = []
            continue
        for name in file_names:
            path = current / name
            if path.suffix.lower() in TEXT_EXTENSIONS and not path.name.startswith("."):
                yield path


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    failures: list[str] = []
    bom_files: list[Path] = []
    checked = 0

    for path in iter_text_files(root):
        checked += 1
        try:
            content = path.read_bytes()
            content.decode("utf-8")
        except (OSError, UnicodeDecodeError) as error:
            failures.append(f"{path.relative_to(root)}: {error}")
            continue
        if content.startswith(BOM):
            bom_files.append(path)
            if args.fix_bom:
                path.write_bytes(content[len(BOM):])

    for failure in failures:
        print(f"Non-UTF-8: {failure}", file=sys.stderr)
    if bom_files:
        label = "Removed UTF-8 BOM" if args.fix_bom else "UTF-8 BOM"
        for path in bom_files:
            print(f"{label}: {path.relative_to(root)}")

    print(f"Checked {checked} text files; {len(failures)} invalid UTF-8; {len(bom_files)} BOM files.")
    return 1 if failures or (args.require_no_bom and bom_files and not args.fix_bom) else 0


if __name__ == "__main__":
    raise SystemExit(main())
