# 渐墨

> 📟 一个为墨水屏设备生成优化壁纸的在线工具

渐墨（E-Ink Wallpaper Generator）是一款基于 Web 的墨水屏壁纸生成工具，能够将彩色图片转换为适合各类墨水屏设备显示的黑白灰度壁纸。支持多种抖动算法、实时预览和精确裁剪，让每张壁纸都能完美适配你的设备。

## ✨ 功能特性

- **多设备预设** — 内置 Kindle、Kobo、文石(Boox)、汉王、掌阅等 20+ 款主流墨水屏设备分辨率
- **多种抖动算法** — 支持 Floyd-Steinberg、有序抖动(Bayer)、Atkinson 和固定阈值等算法
- **灵活的灰度转换** — 提供亮度加权、平均值、去饱和度、单通道等多种灰度模式
- **图像调整** — 可调节对比度、亮度、锐度、伽马校正和高斯模糊
- **智能裁剪** — 按设备比例锁定裁剪区域，精确选择感兴趣区域
- **实时预览** — 所有调整即时生效，所见即所得
- **多格式导出** — 支持 PNG（无损）、BMP（无压缩）、JPEG 三种输出格式
- **拖拽上传** — 支持拖拽或点击上传图片

## 📱 支持的设备

| 品牌 | 设备 |
|------|------|
| Kindle | Paperwhite, Oasis, Scribe |
| Kobo | Clara HD, Libra 2, Sage |
| 文石 (Boox) | Poke 4/5, Page, Note Air 1/2, Tab Ultra/C |
| 汉王 (Hanvon) | N10, N10 Mini, N10 Max |
| 掌阅 (iReader) | Ocean 3, C6, C7, Smart 3, Smart 4 |
| 其他 | MeeBook P78, PocketBook InkPad 4 |
| 手机/平板 | iPhone SE/15/15 Pro Max, iPad Mini/Air |

## 🚀 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装

```bash
# 克隆项目
git clone https://github.com/lddd666/渐墨.git
cd 渐墨

# 安装依赖
pip install -r requirements.txt
```

### 运行

```bash
python app.py
```

服务启动后，在浏览器中访问 `http://localhost:5000` 即可使用。

### 生产环境部署

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🛠️ 技术栈

- **后端**：Python + Flask
- **图像处理**：Pillow (PIL) + NumPy
- **前端**：HTML + CSS + JavaScript
- **生产服务器**：Gunicorn

## 📁 项目结构

```
渐墨/
├── app.py                 # Flask 应用主文件
├── requirements.txt       # Python 依赖
├── templates/
│   └── index.html         # 页面模板
├── static/
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       └── main.js        # 前端交互逻辑
└── uploads/               # 临时上传目录（已忽略）
```

## 📄 许可证

MIT License