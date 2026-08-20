#!/usr/bin/env python3
"""Synchronize the app semantic version across its release metadata files.

Usage:
    python scripts/bump_version.py          # 0.2.0 -> 0.2.1
    python scripts/bump_version.py minor    # 0.2.0 -> 0.3.0
    python scripts/bump_version.py major    # 0.2.0 -> 1.0.0
    python scripts/bump_version.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")


def bump_version(version: str, part: str = "patch") -> str:
    if not VERSION_RE.fullmatch(version):
        raise ValueError(f"Unexpected version format: {version!r}")

    major, minor, patch = map(int, version.split("."))
    if part == "major":
        return f"{major + 1}.0.0"
    if part == "minor":
        return f"{major}.{minor + 1}.0"
    if part == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"Unexpected version part: {part!r}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bump the app semantic version.")
    parser.add_argument(
        "part",
        nargs="?",
        choices=("patch", "minor", "major"),
        default="patch",
        help="version segment to bump (default: patch)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the planned version without changing files",
    )
    return parser.parse_args()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, content: dict) -> None:
    path.write_text(
        json.dumps(content, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def cargo_package_version(cargo_text: str) -> tuple[str, str]:
    match = re.search(
        r"(?ms)^\[package\]\s*$(.*?^version\s*=\s*\")([^\"]+)(\")",
        cargo_text,
    )
    if match is None:
        raise ValueError("Could not locate [package].version in src-tauri/Cargo.toml")
    return match.group(2), cargo_text[: match.start(2)] + "{version}" + cargo_text[match.end(2) :]


def cargo_package_name(cargo_text: str) -> str:
    match = re.search(r"(?ms)^\[package\]\s*$(.*?^name\s*=\s*\")([^\"]+)(\")", cargo_text)
    if match is None:
        raise ValueError("Could not locate [package].name in src-tauri/Cargo.toml")
    return match.group(2)


def replace_cargo_lock_version(cargo_lock: str, package_name: str, old: str, new: str) -> str:
    package_re = re.compile(
        rf'(?ms)(\[\[package\]\]\s*^name\s*=\s*"{re.escape(package_name)}"\s*^version\s*=\s*")'
        rf'{re.escape(old)}(")'
    )
    updated, count = package_re.subn(rf"\g<1>{new}\g<2>", cargo_lock, count=1)
    if count != 1:
        raise ValueError(f"Could not locate {package_name!r} {old} in src-tauri/Cargo.lock")
    return updated


def main() -> None:
    args = parse_args()
    package_path = ROOT / "package.json"
    package_lock_path = ROOT / "package-lock.json"
    tauri_path = ROOT / "src-tauri" / "tauri.conf.json"
    cargo_path = ROOT / "src-tauri" / "Cargo.toml"
    cargo_lock_path = ROOT / "src-tauri" / "Cargo.lock"

    package = read_json(package_path)
    package_lock = read_json(package_lock_path)
    tauri_config = read_json(tauri_path)
    cargo_text = cargo_path.read_text(encoding="utf-8")
    cargo_lock = cargo_lock_path.read_text(encoding="utf-8")

    old = package.get("version")
    if not isinstance(old, str) or not VERSION_RE.fullmatch(old):
        raise ValueError("package.json must contain a semantic version (x.y.z)")

    cargo_version, cargo_template = cargo_package_version(cargo_text)
    versions = {
        "package-lock.json": package_lock.get("version"),
        "package-lock.json packages[\"\"]": package_lock.get("packages", {}).get("", {}).get("version"),
        "src-tauri/tauri.conf.json": tauri_config.get("version"),
        "src-tauri/Cargo.toml": cargo_version,
    }
    mismatches = {path: value for path, value in versions.items() if value != old}
    if mismatches:
        details = ", ".join(f"{path}={value!r}" for path, value in mismatches.items())
        raise ValueError(f"Version files are already out of sync with package.json ({old}): {details}")

    new = bump_version(old, args.part)
    print(f"[version:bump] {old} -> {new} ({args.part})")
    if args.dry_run:
        return

    package["version"] = new
    package_lock["version"] = new
    package_lock["packages"][""]["version"] = new
    tauri_config["version"] = new

    write_json(package_path, package)
    write_json(package_lock_path, package_lock)
    write_json(tauri_path, tauri_config)
    cargo_path.write_text(cargo_template.replace("{version}", new), encoding="utf-8")
    cargo_lock_path.write_text(
        replace_cargo_lock_version(cargo_lock, cargo_package_name(cargo_text), old, new),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
