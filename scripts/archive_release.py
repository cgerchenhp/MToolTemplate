#!/usr/bin/env python3
"""Archive the staged Portable release without including build intermediates."""

from __future__ import annotations

import hashlib
import json
import os
import stat
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
PORTABLE_DIR = REPO_ROOT / "src-tauri" / "target" / "release-portable"
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
MANIFEST_PATH = PORTABLE_DIR / "release-manifest.json"
PROJECT_CONFIG_PATH = REPO_ROOT / "project.config.json"


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _safe_name(value: str) -> str:
    cleaned = "".join(
        character.lower()
        if (character.isascii() and character.isalnum()) or character in "._-"
        else "-"
        for character in value.strip()
    )
    return "-".join(part for part in cleaned.split("-") if part) or "mtool-app"


def _validate_release(manifest: dict) -> None:
    if manifest.get("schema_version") != "mtool-portable-release-v1":
        raise RuntimeError(f"Unsupported Portable manifest: {MANIFEST_PATH}")
    for key in ("app", "backend"):
        relative = Path(str(manifest.get(key) or ""))
        if not relative.parts or relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError(f"Unsafe {key} path in release manifest: {relative}")
        if not (PORTABLE_DIR / relative).is_file():
            raise FileNotFoundError(
                f"Portable {key} is missing: {PORTABLE_DIR / relative}"
            )


def _write_zip_entry(
    archive: zipfile.ZipFile,
    source: Path,
    archive_name: str,
) -> None:
    source_stat = source.lstat()
    if source.is_symlink():
        info = zipfile.ZipInfo(archive_name)
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(info, os.readlink(source))
        return

    archive.write(source, archive_name)
    info = archive.getinfo(archive_name)
    info.create_system = 3
    info.external_attr = (source_stat.st_mode & 0xFFFF) << 16


def archive_release() -> Path:
    if not MANIFEST_PATH.is_file():
        raise FileNotFoundError(
            "Portable release is missing. Run npm run release:portable first."
        )

    manifest = _read_json(MANIFEST_PATH)
    _validate_release(manifest)
    project_config = _read_json(PROJECT_CONFIG_PATH)
    project_id = _safe_name(str(project_config.get("projectId") or "mtool-app"))
    version = _safe_name(str(manifest.get("version") or "unknown"))
    platform_name = _safe_name(str(manifest.get("platform") or "unknown"))
    base_name = f"{project_id}-v{version}-{platform_name}-portable"

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    artifacts_root = ARTIFACTS_DIR.resolve()
    archive_path = (ARTIFACTS_DIR / f"{base_name}.zip").resolve()
    archive_path.relative_to(artifacts_root)
    temporary_path = archive_path.with_suffix(".zip.tmp")
    if temporary_path.exists():
        temporary_path.unlink()

    try:
        with zipfile.ZipFile(
            temporary_path,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as archive:
            for source in sorted(PORTABLE_DIR.rglob("*")):
                if source.is_dir() and not source.is_symlink():
                    continue
                relative = source.relative_to(PORTABLE_DIR).as_posix()
                _write_zip_entry(archive, source, f"{base_name}/{relative}")
        temporary_path.replace(archive_path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    hasher = hashlib.sha256()
    with archive_path.open("rb") as archive_file:
        for chunk in iter(lambda: archive_file.read(1024 * 1024), b""):
            hasher.update(chunk)
    digest = hasher.hexdigest()
    checksum_path = archive_path.with_suffix(".zip.sha256")
    checksum_path.write_text(
        f"{digest}  {archive_path.name}\n",
        encoding="utf-8",
    )
    print(f"[archive_release] Archive: {archive_path}")
    print(
        f"[archive_release] Size: {archive_path.stat().st_size / (1024 ** 2):.1f} MiB"
    )
    print(f"[archive_release] SHA-256: {digest}")
    return archive_path


def main() -> int:
    archive_release()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
