# tests 目录说明

本目录包含 Tauri React Python Template 后端的所有自动化测试。

## 目录结构

```
tests/
├── conftest.py          # 共享 fixtures（测试客户端、临时图片、ICO 等）
├── fixtures/            # 静态测试素材
│   ├── README.md        # 本文件
│   └── sample.svg       # 用于 SVG 转图标测试的参考 SVG
├── test_main.py         # 通用端点：/api/hello, /api/sysinfo, /api/echo
├── test_icons.py        # 图标生成：/api/icons/from-text, /api/icons/from-svg
└── test_image_info.py   # 图像信息：/api/image/info, /api/image/icon_info
```

## fixtures/ 目录说明

| 文件 | 用途 | 是否可替换 |
|------|------|-----------|
| `sample.svg` | SVG 转图标功能测试，内容为简单的矩形+字母 | 可替换为任何合法 SVG |

> 动态生成的测试图片（PNG、JPEG、ICO）由 `conftest.py` 中的 `pytest.fixture` 在运行时使用 Pillow 自动创建，
> 存放于 pytest 的临时目录 (`tmp_path`)，测试结束后**自动清理**，无需手动管理。

## 如果想添加自己的测试素材

将文件放入此 `fixtures/` 目录，然后在 `conftest.py` 中添加对应 fixture：

```python
@pytest.fixture
def my_custom_image():
    return os.path.join(FIXTURES_DIR, "my_image.png")
```
