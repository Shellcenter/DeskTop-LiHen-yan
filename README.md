# 离恨烟桌宠 — 开发说明文档

## 项目概述

Tauri v2 桌面宠物应用，透明窗口显示 Q 版角色"离恨烟"，可拖拽、右键菜单、与 Claude Code 联动。

## 项目结构

```
D:\桌面\Desktop-pet\
├── index.html              # 主窗口 HTML（桌宠界面）
├── dashboard.html          # 仪表盘窗口 HTML
├── package.json            # Node 依赖与脚本
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 配置
│
├── src/                    # 前端源码（TypeScript）
│   ├── main.ts             # 主逻辑：事件绑定、状态管理、窗口控制
│   ├── state.ts            # 角色状态定义、状态管理器、互动日志
│   ├── styles.css          # 全部样式（透明窗口、菜单、气泡）
│   └── dashboard-page.ts   # 仪表盘页面逻辑
│
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # 入口（Windows GUI 子系统）
│   │   └── lib.rs          # Tauri 命令：配置、进程检测、文件投喂等
│   ├── Cargo.toml          # Rust 依赖
│   ├── tauri.conf.json     # Tauri 配置（窗口、打包、标识符）
│   ├── build.rs            # 构建脚本
│   └── capabilities/
│       └── default.json    # 权限声明
│
├── public/
│   └── models/
│       └── lihenyan/
│           ├── model.json  # 模型部件、锚点、层级、动作类型
│           └── full.png    # 第一阶段整图模型主体
│
├── scripts/                # 辅助脚本
│   ├── launch-silent.vbs   # VBS 静默启动（无控制台窗口）
│   ├── install-desktop-pet.ps1  # 安装部署脚本
│   └── ...
│
├── dist/                   # 构建产物（Vite 打包输出）
│   ├── index.html
│   ├── assets/
│   └── models/             # 构建后复制的角色模型资源
│
└── 启动桌宠.bat            # 一键启动批处理
```

## 桌宠模型状态

第一阶段已经从“多张状态图切换”改为“单角色模型舞台”。当前模型入口为：

```text
public/models/lihenyan/model.json
```

`model.json` 目前只包含 `full.png` 一个部件，但已经支持每个部件独立声明图片、锚点、位置、层级和动作类型。PixiJS 负责渲染模型部件、烟雾、花瓣、水波和青色光点，GSAP 负责点击、打招呼、思考、工作、睡眠等动作过渡。后续拆出头发、伞、飘带、眼睛等图层后，可以继续追加到 `parts` 数组里，升级成伪 Live2D。

## 启动方式

### 方式一：桌面快捷方式
双击桌面 `离恨烟桌宠.lnk`（指向静默启动脚本，无控制台窗口）

### 方式二：直接运行（可能有控制台窗口）
双击 `%LOCALAPPDATA%\DesktopPet\DesktopPet.exe`

### 方式三：批处理
双击项目根目录 `启动桌宠.bat`

## 工作流程

1. **构建**：`npm run build` → 前端打包到 `dist/`
2. **编译**：`cargo build --release` → Rust 编译出 exe
3. **完整构建**：`npm run build:exe`（tauri build --no-bundle）
4. **安装**：`scripts/install-desktop-pet.ps1` → 复制 exe 到 `%LOCALAPPDATA%\DesktopPet\` + 创建中文快捷方式

## 关键说明

### 模型资源
- 模型入口为 `public/models/lihenyan/model.json`
- 第一阶段主体图放在 `public/models/lihenyan/full.png`
- 构建时 Vite 会自动复制 `public/` 下的模型资源到 `dist/`
- 后续分层建模会继续放在 `public/models/lihenyan/` 下

### 透明窗口
- 使用 Tauri 透明窗口 + `#00000000` 背景色
- HTML/body 设 `background: transparent`
- 窗口无边框、置顶、跳过任务栏

### Claude Code 联动
- Rust 后端用 `sysinfo` 检测 claude/claude-code 进程
- 检测到 → 触发 `claude-code-status` 事件 → 宠物进入 working 行为，动作变安静并出现青色粒子
- 菜单"启动 Claude" → `start_claude_process` 命令

### 隐藏控制台窗口
- `src-tauri/src/main.rs` 中 `#![windows_subsystem = "windows"]`
- 桌面快捷方式通过 VBS 脚本 (`wscript.exe`) 启动，避免弹 cmd 窗口
- VBS 脚本位于安装目录：`LaunchDesktopPet.vbs`

## 常用命令

```bash
# 开发模式（热更新）
npm run dev

# 仅构建前端
npm run build

# 完整构建发布版 exe（推荐）
npm run build:exe

# 构建 + 安装到本地 + 创建快捷方式
npm run install:app

# 直接启动
双击 启动桌宠.bat
```

## 依赖

### Node（前端）
- vite ^6.3.0
- typescript ^5.8.0
- @tauri-apps/api ^2.5.0
- @tauri-apps/cli ^2.5.0（dev）
- pixi.js ^8
- gsap ^3

### Rust（后端）
- tauri 2 (features = [])
- tauri-plugin-opener 2
- serde / serde_json
- sysinfo 0.33

## 常见问题

**Q: 宠物窗口一片空白？**
A: 检查 `public/models/lihenyan/model.json` 和 `full.png` 是否存在，并确认前端构建成功

**Q: 启动后弹出 cmd 窗口？**
A: 通过桌面快捷方式启动（VBS 静默），不要直接双击 exe

**Q: 发布版无法启动/白屏？**
A: 确保用 `npm run build:exe` 或 `tauri build --no-bundle` 构建，不要直接用 `cargo build`

**Q: 点击没反应/功能不可用？**
A: 可能是旧进程残留在运行，先任务管理器结束 DesktopPet.exe 再启动
