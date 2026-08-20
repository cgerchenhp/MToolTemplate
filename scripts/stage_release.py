#!/usr/bin/env python3
"""Create a clean portable desktop release from the Tauri build output."""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_ROOT = REPO_ROOT / "src-tauri" / "target"
TAURI_RELEASE_DIR = TARGET_ROOT / "release"
PORTABLE_DIR = TARGET_ROOT / "release-portable"
TAURI_CONFIG_PATH = REPO_ROOT / "src-tauri" / "tauri.conf.json"
PACKAGE_PATH = REPO_ROOT / "package.json"


def _read_metadata() -> dict[str, str]:
    tauri_config = json.loads(TAURI_CONFIG_PATH.read_text(encoding="utf-8"))
    package = json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))
    package_version = str(package.get("version") or "").strip()
    tauri_version = str(tauri_config.get("version") or "").strip()
    if package_version != tauri_version:
        raise ValueError(
            "Release versions are out of sync: "
            f"package.json={package_version!r}, tauri.conf.json={tauri_version!r}"
        )
    metadata = {
        "product_name": str(tauri_config.get("productName") or "").strip(),
        "main_binary_name": str(tauri_config.get("mainBinaryName") or "").strip(),
        "identifier": str(tauri_config.get("identifier") or "").strip(),
        "version": package_version,
    }
    missing = [name for name, value in metadata.items() if not value]
    if missing:
        raise ValueError(f"Release metadata is incomplete: {', '.join(missing)}")
    return metadata


def _replace_portable_dir(path: Path) -> None:
    target_root = TARGET_ROOT.resolve()
    resolved = path.resolve()
    resolved.relative_to(target_root)
    if resolved == target_root:
        raise RuntimeError(f"Refusing to replace target root: {resolved}")
    if resolved.exists():
        try:
            shutil.rmtree(resolved)
        except PermissionError as exc:
            raise RuntimeError(
                "Cannot replace the Portable release while it is in use. "
                f"Close processes launched from {resolved}."
            ) from exc
    resolved.mkdir(parents=True)


def _copy_required(source: Path, destination: Path, *, symlinks: bool = False) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Required release input is missing: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        shutil.copytree(source, destination, symlinks=symlinks)
    else:
        shutil.copy2(source, destination)


def _stage_windows(metadata: dict[str, str]) -> tuple[str, str]:
    app_name = f"{metadata['main_binary_name']}.exe"
    backend_relative = Path("_internal") / "backend.exe"
    _copy_required(TAURI_RELEASE_DIR / app_name, PORTABLE_DIR / app_name)
    _copy_required(TAURI_RELEASE_DIR / "_internal", PORTABLE_DIR / "_internal")
    if not (PORTABLE_DIR / backend_relative).is_file():
        raise RuntimeError(f"Portable backend is missing: {PORTABLE_DIR / backend_relative}")
    legacy_backend = PORTABLE_DIR / "backend.exe"
    if legacy_backend.exists():
        raise RuntimeError(f"Portable release contains a legacy root backend: {legacy_backend}")
    return app_name, backend_relative.as_posix()


def _stage_macos(metadata: dict[str, str]) -> tuple[str, str]:
    bundle_name = f"{metadata['product_name']}.app"
    source_bundle = TAURI_RELEASE_DIR / "bundle" / "macos" / bundle_name
    destination_bundle = PORTABLE_DIR / bundle_name
    _copy_required(source_bundle, destination_bundle, symlinks=True)

    app_relative = Path(bundle_name) / "Contents" / "MacOS" / metadata["main_binary_name"]
    backend_relative = Path(bundle_name) / "Contents" / "MacOS" / "backend"
    for required in (app_relative, backend_relative):
        if not (PORTABLE_DIR / required).is_file():
            raise RuntimeError(f"Portable macOS bundle is incomplete: {PORTABLE_DIR / required}")
    return app_relative.as_posix(), backend_relative.as_posix()


def _payload_stats(path: Path) -> tuple[int, int]:
    files = [item for item in path.rglob("*") if item.is_file()]
    return len(files), sum(item.stat().st_size for item in files)


def stage_release() -> Path:
    if sys.platform not in {"win32", "darwin"}:
        raise RuntimeError("Portable releases are supported on Windows and macOS")

    metadata = _read_metadata()
    _replace_portable_dir(PORTABLE_DIR)
    if sys.platform == "win32":
        app_relative, backend_relative = _stage_windows(metadata)
        instructions = (
            f"Run {app_relative} from this directory. Keep the executable and "
            "_internal directory together.\n"
        )
        platform_name = "windows"
    else:
        app_relative, backend_relative = _stage_macos(metadata)
        instructions = f"Open {metadata['product_name']}.app. Keep the App bundle intact.\n"
        platform_name = "macos"

    (PORTABLE_DIR / "README-PORTABLE.txt").write_text(
        f"{metadata['product_name']} Portable release\n\n{instructions}",
        encoding="utf-8",
    )
    file_count, total_bytes = _payload_stats(PORTABLE_DIR)
    manifest = {
        "schema_version": "mtool-portable-release-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "artifact_type": "portable",
        "platform": platform_name,
        "product_name": metadata["product_name"],
        "main_binary_name": metadata["main_binary_name"],
        "identifier": metadata["identifier"],
        "version": metadata["version"],
        "app": app_relative,
        "backend": backend_relative,
        "payload_files": file_count,
        "payload_bytes": total_bytes,
    }
    (PORTABLE_DIR / "release-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"[stage_release] Portable release: {PORTABLE_DIR}\n"
        f"[stage_release] {file_count} payload files, {total_bytes / (1024 ** 2):.1f} MiB"
    )
    return PORTABLE_DIR


def main() -> int:
    stage_release()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
