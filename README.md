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
│   └── character/          # ★ 角色图片存放目录 ★
│       ├── idle.png        # 待机（默认显示）
│       ├── wave.png        # 打招呼
│       ├── happy.png       # 开心
│       ├── think.png       # 思考
│       ├── typing.png      # 打字
│       ├── working.png     # 工作中
│       └── sleep.png       # 睡觉
│
├── scripts/                # 辅助脚本
│   ├── launch-silent.vbs   # VBS 静默启动（无控制台窗口）
│   ├── install-desktop-pet.ps1  # 安装部署脚本
│   └── ...
│
├── dist/                   # 构建产物（Vite 打包输出）
│   ├── index.html
│   ├── assets/
│   └── character/          # 构建后复制的角色图片
│
└── 启动桌宠.bat            # 一键启动批处理
```

## 7 种角色状态

| 状态名 | 文件名 | 描述 | 触发条件 |
|--------|--------|------|----------|
| idle | idle.png | 待机/默认 | 无操作 |
| wave | wave.png | 挥手打招呼 | 右键菜单"打招呼"/启动问候 |
| happy | happy.png | 开心跳跃 | 单击宠物 |
| think | think.png | 歪头思考 | 空闲循环随机切换 |
| typing | typing.png | 打字 | 空闲循环随机切换 |
| working | working.png | 专注工作 | Claude Code 进程检测到 |
| sleep | sleep.png | 闭眼睡觉 | 空闲循环随机切换/退出时 |

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

### 图片资源
- 角色图片放在 `public/character/` 目录下
- 图片格式优先级：png > webp > gif
- 构建时 Vite 插件自动复制 `public/character/` 到 `dist/character/`
- **必须有 idle.png，否则宠物显示不出来**

### 透明窗口
- 使用 Tauri 透明窗口 + `#00000000` 背景色
- HTML/body 设 `background: transparent`
- 窗口无边框、置顶、跳过任务栏

### Claude Code 联动
- Rust 后端用 `sysinfo` 检测 claude/claude-code 进程
- 检测到 → 触发 `claude-code-status` 事件 → 宠物切换到 working 状态
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

### Rust（后端）
- tauri 2 (features = [])
- tauri-plugin-opener 2
- serde / serde_json
- sysinfo 0.33

## 常见问题

**Q: 宠物窗口一片空白？**
A: 检查 `public/character/` 下是否有 idle.png 等图片文件

**Q: 启动后弹出 cmd 窗口？**
A: 通过桌面快捷方式启动（VBS 静默），不要直接双击 exe

**Q: 发布版无法启动/白屏？**
A: 确保用 `npm run build:exe` 或 `tauri build --no-bundle` 构建，不要直接用 `cargo build`

**Q: 点击没反应/功能不可用？**
A: 可能是旧进程残留在运行，先任务管理器结束 DesktopPet.exe 再启动
