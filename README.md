# 离恨烟桌宠

Tauri v2 桌面宠物应用，透明窗口显示《王者荣耀》公孙离·离恨烟 Q 版角色。

## 功能

- **7 种形态切换** — idle / wave / happy / think / typing / sleep / working，点击轮换
- **右键菜单** — 打招呼、查看 Claude 状态、启动 Claude、退出
- **拖拽移动** — 按住角色拖到屏幕任意位置
- **对话气泡** — 不同状态弹出随机文案
- **Claude Code 联动** — 自动检测 Claude Code 进程，切换到 working 状态；支持拖拽文件/文件夹到宠物上启动 Claude Code 并分析
- **透明无边框窗口** — 置顶显示，跳过任务栏
- **仪表盘** — 调节透明度、缩放、置顶等设置（Ctrl+Shift+P）

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 构建发布版 exe
npm run build:exe

# 构建 + 安装到本地
npm run install:app
```

构建产物在 `src-tauri/target/release/desktop-pet.exe`。

## 项目结构

```
├── src/                    # 前端 TypeScript
│   ├── main.ts             # 主逻辑（交互、状态管理、Claude 联动）
│   ├── state.ts            # 状态定义、优先级系统
│   ├── styles.css          # 样式（透明窗口、菜单、气泡）
│   └── dashboard-page.ts   # 仪表盘
├── index.html              # 主窗口
├── dashboard.html          # 仪表盘窗口
├── public/character/       # 7 张角色状态图
├── src-tauri/              # Rust 后端
│   ├── src/lib.rs          # Tauri 命令
│   ├── src/main.rs         # 入口
│   └── tauri.conf.json     # Tauri 配置
└── package.json
```

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri v2 |
| 前端 | TypeScript + Vite 6 |
| 后端 | Rust |
| 进程检测 | sysinfo |

## 启动方式

- 双击桌面 **离恨烟静态** 快捷方式
- 或直接运行 `%LOCALAPPDATA%\DesktopPet\DesktopPet.exe`

## 角色

离恨烟是《王者荣耀》公孙离"墨染江湖"系列无双限定皮肤。离恨楼亲传弟子，武器为长笛"离人泪"，以控烟之法闻名江湖。
