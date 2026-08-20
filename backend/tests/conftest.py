"""
conftest.py — 全局 pytest fixtures
=====================================
本文件中的 fixture 可被 tests/ 目录下的所有测试文件直接使用，无需单独导入。

Fixtures 说明
-------------
client          : FastAPI TestClient（session 级别，整个测试会话只创建一次）
tmp_output_dir  : 临时输出目录字符串（每个测试函数独立，测试结束后自动清理）
"""

import os

import pytest
from fastapi.testclient import TestClient


# --------------------------------------------------------------------------
# 解析 fixtures 目录路径（与本文件同级的 fixtures/ 子目录）
# --------------------------------------------------------------------------
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


# --------------------------------------------------------------------------
# 应用 & HTTP Client
# --------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """
    创建 FastAPI TestClient，整个测试会话共用一个实例。

    TestClient 使用 ASGI 传输层直接调用应用，无需启动真实 HTTP 服务器，
    因此测试速度快、无端口冲突。
    """
    # 延迟导入，避免 pytest 收集阶段触发 main.py 的副作用
    from main import app  # noqa: PLC0415
    with TestClient(app) as c:
        yield c


# --------------------------------------------------------------------------
# 目录 fixtures
# --------------------------------------------------------------------------

@pytest.fixture
def tmp_output_dir(tmp_path):
    """每个测试函数独享一个临时输出目录（绝对路径字符串）。"""
    d = tmp_path / "icon_output"
    d.mkdir()
    return str(d)
