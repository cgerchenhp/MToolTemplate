"""Tests for project-specific backend port configuration."""

import json

import pytest

from core import runtime_config


def test_reads_backend_port_from_project_config(monkeypatch, tmp_path):
    config = tmp_path / "project.config.json"
    config.write_text(json.dumps({"backendPort": 23456}), encoding="utf-8")
    monkeypatch.setenv(runtime_config.PROJECT_CONFIG_ENV, str(config))
    monkeypatch.delenv(runtime_config.BACKEND_PORT_ENV, raising=False)

    assert runtime_config.configured_backend_port() == 23456


def test_environment_port_overrides_project_config(monkeypatch, tmp_path):
    config = tmp_path / "project.config.json"
    config.write_text(json.dumps({"backendPort": 23456}), encoding="utf-8")
    monkeypatch.setenv(runtime_config.PROJECT_CONFIG_ENV, str(config))
    monkeypatch.setenv(runtime_config.BACKEND_PORT_ENV, "24567")

    assert runtime_config.configured_backend_port() == 24567


@pytest.mark.parametrize("value", ["", 0, 1023, 65536, True, "invalid"])
def test_rejects_invalid_configured_ports(monkeypatch, tmp_path, value):
    config = tmp_path / "project.config.json"
    config.write_text(json.dumps({"backendPort": value}), encoding="utf-8")
    monkeypatch.setenv(runtime_config.PROJECT_CONFIG_ENV, str(config))
    monkeypatch.delenv(runtime_config.BACKEND_PORT_ENV, raising=False)

    with pytest.raises(RuntimeError, match="between 1024 and 65535"):
        runtime_config.configured_backend_port()
