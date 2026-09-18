import importlib.util
from pathlib import Path

import pytest


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "bump_version.py"
SPEC = importlib.util.spec_from_file_location("bump_version", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
bump_version = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bump_version)


@pytest.mark.parametrize(
    ("current", "part", "expected_version", "expected_mode"),
    [
        ("0.2.0", None, "0.2.1", "patch"),
        ("0.2.0", "minor", "0.3.0", "minor"),
        ("0.2.0", "major", "1.0.0", "major"),
        ("0.2.0", "patch", "0.2.1", "patch"),
        ("0.2.0", None, "1.2.3", "set"),
    ],
)
def test_resolve_target_version(
    current,
    part,
    expected_version,
    expected_mode,
):
    explicit_version = expected_version if expected_mode == "set" else None

    assert bump_version.resolve_target_version(current, part, explicit_version) == (
        expected_version,
        expected_mode,
    )


@pytest.mark.parametrize("explicit_version", ["0.2.0", "0.1.9"])
def test_explicit_version_must_increase(explicit_version):
    with pytest.raises(ValueError, match="must be greater"):
        bump_version.resolve_target_version("0.2.0", None, explicit_version)


def test_explicit_version_cannot_be_combined_with_part(monkeypatch):
    monkeypatch.setattr(
        "sys.argv",
        ["bump_version.py", "minor", "--set", "1.0.0"],
    )

    with pytest.raises(SystemExit):
        bump_version.parse_args()


def test_explicit_version_requires_three_numeric_parts(monkeypatch):
    monkeypatch.setattr("sys.argv", ["bump_version.py", "--set", "1.2"])

    with pytest.raises(SystemExit):
        bump_version.parse_args()
