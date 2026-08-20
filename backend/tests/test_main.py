"""
test_main.py — 通用端点测试
==============================
覆盖范围：
  GET  /api/hello        健康检查
  GET  /api/sysinfo      系统信息
  POST /api/echo         消息回声

这些端点是后端正常工作的基础，任何破坏性改动都会在此处被捕获。
"""

import io
import platform
from unittest.mock import MagicMock

import pytest


# ========================================================================== 
# App infrastructure policies
# ========================================================================== 

class TestDevelopmentReloadPolicy:
    """Windows npm/VS Code tasks must not be terminated by Uvicorn reload."""

    def test_windows_defaults_to_stable_single_process(self, monkeypatch):
        import main

        monkeypatch.delenv("BACKEND_RELOAD", raising=False)
        monkeypatch.setattr(main.platform, "system", lambda: "Windows")

        assert main._dev_reload_enabled() is False

    def test_non_windows_keeps_hot_reload_default(self, monkeypatch):
        import main

        monkeypatch.delenv("BACKEND_RELOAD", raising=False)
        monkeypatch.setattr(main.platform, "system", lambda: "Linux")

        assert main._dev_reload_enabled() is True

    @pytest.mark.parametrize(
        ("value", "expected"),
        [("1", True), ("true", True), ("0", False), ("false", False)],
    )
    def test_explicit_environment_override(self, monkeypatch, value, expected):
        import main

        monkeypatch.setenv("BACKEND_RELOAD", value)

        assert main._dev_reload_enabled() is expected


class TestPackagedShutdown:
    def test_sidecar_shutdown_command_requests_uvicorn_exit(self):
        import main

        server = MagicMock(should_exit=False)
        main._watch_sidecar_commands(
            server,
            io.StringIO("ignored\nshutdown\nignored-after-shutdown\n"),
        )

        assert server.should_exit is True

    def test_sidecar_pipe_eof_requests_uvicorn_exit(self):
        import main

        server = MagicMock(should_exit=False)
        main._watch_sidecar_commands(server, io.StringIO(""))

        assert server.should_exit is True


class TestCorsPolicy:
    def test_local_development_origin_is_allowed(self, client):
        origin = "http://127.0.0.1:5175"
        response = client.options(
            "/api/hello",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

        assert response.headers.get("access-control-allow-origin") == origin

    def test_arbitrary_web_origin_is_not_allowed(self, client):
        origin = "https://example.com"
        response = client.options(
            "/api/hello",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

        assert response.headers.get("access-control-allow-origin") is None


# ==========================================================================
# GET /api/hello
# ==========================================================================

class TestHello:
    """健康检查端点，前端用它探测后端是否就绪。"""

    def test_returns_200(self, client):
        """正常请求应返回 HTTP 200。"""
        response = client.get("/api/hello")
        assert response.status_code == 200

    def test_response_has_message_key(self, client):
        """响应体必须包含 message 字段。"""
        data = client.get("/api/hello").json()
        assert "message" in data

    def test_message_is_non_empty(self, client):
        """message 字段值不能为空字符串。"""
        data = client.get("/api/hello").json()
        assert data["message"]


# ==========================================================================
# GET /api/sysinfo
# ==========================================================================

class TestSysinfo:
    """系统信息端点，返回运行环境的平台与 Python 版本信息。"""

    def test_returns_200(self, client):
        response = client.get("/api/sysinfo")
        assert response.status_code == 200

    def test_all_required_fields_present(self, client):
        """响应体必须包含 4 个约定字段。"""
        data = client.get("/api/sysinfo").json()
        for field in ("os", "os_version", "python_version", "machine"):
            assert field in data, f"缺少字段: {field}"

    def test_os_matches_actual_platform(self, client):
        """os 字段必须与运行测试的实际操作系统一致。"""
        data = client.get("/api/sysinfo").json()
        assert data["os"] == platform.system()

    def test_python_version_is_semver(self, client):
        """python_version 应符合 x.y.z 格式。"""
        data = client.get("/api/sysinfo").json()
        parts = data["python_version"].split(".")
        assert len(parts) >= 2
        assert all(p.isdigit() for p in parts[:2])

    def test_all_fields_are_strings(self, client):
        """所有字段值都应为字符串。"""
        data = client.get("/api/sysinfo").json()
        for field in ("os", "os_version", "python_version", "machine"):
            assert isinstance(data[field], str), f"{field} 应为 str，实际为 {type(data[field])}"


# ==========================================================================
# POST /api/echo
# ==========================================================================

class TestEcho:
    """Echo 端点，将收到的消息原样附加 '(echo from backend)' 后返回。"""

    def test_returns_200(self, client):
        response = client.post("/api/echo", json={"message": "hello"})
        assert response.status_code == 200

    def test_reply_contains_original_message(self, client):
        """回复中应包含原始输入内容。"""
        response = client.post("/api/echo", json={"message": "hello"})
        assert "hello" in response.json()["message"]

    def test_reply_has_echo_suffix(self, client):
        """回复末尾应带有后端标识字符串。"""
        response = client.post("/api/echo", json={"message": "hello"})
        assert "(echo from backend)" in response.json()["message"]

    def test_chinese_message(self, client):
        """中文输入应被正确处理，不出现编码错误。"""
        response = client.post("/api/echo", json={"message": "你好世界"})
        assert response.status_code == 200
        assert "你好世界" in response.json()["message"]

    def test_missing_message_field_returns_422(self, client):
        """缺少 message 字段时，Pydantic 校验应返回 422。"""
        response = client.post("/api/echo", json={})
        assert response.status_code == 422

    def test_wrong_body_type_returns_422(self, client):
        """非 JSON body 应返回 422（请求体校验失败）。"""
        response = client.post("/api/echo", content="not json", headers={"Content-Type": "application/json"})
        assert response.status_code == 422

    def test_empty_string_message_is_accepted(self, client):
        """空字符串 message 不违反 Pydantic 约束，应返回 200。"""
        response = client.post("/api/echo", json={"message": ""})
        assert response.status_code == 200
