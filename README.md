# Workline — 项目管理桌面应用

基于 **Electron + TypeScript + React + SQLite** 的项目管理桌面应用，功能对标 Microsoft Project 的核心能力：

- 甘特图（周 / 月视图、今日线、按人着色、进度填充）
- 任务依赖关系（前置 / 后续任务）
- 资源分配（负责人 / 参与人）
- 项目流转与任务流转（带责任人、前置条件校验）
- 锚点 / 书签（里程碑、需求变更、问题、决策、备注）—— 甘特图 Pin + 详情时间线两种视图
- 项目维度 / 人维度 两套视角
- 支持 Windows / macOS / Linux 打包

---

## 目录结构

```
workline2/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 窗口创建、生命周期、DevTools
│   │   ├── db.ts             # sql.js（SQLite/WASM）初始化、建表、落盘
│   │   ├── sql.d.ts          # sql.js 最小类型声明
│   │   ├── seed.ts           # 调试种子数据
│   │   └── ipc.ts            # IPC 处理器（增删改查、流转）
│   ├── preload/              # contextBridge 桥接
│   │   ├── index.ts
│   │   └── index.d.ts        # window.api 类型声明
│   ├── shared/
│   │   └── types.ts          # 共享类型、常量、状态/流转定义
│   └── renderer/             # React 渲染进程
│       ├── index.html
│       └── src/
│           ├── App.tsx       # 状态编排与布局
│           ├── lib/          # 格式化 / 数据选择器
│           └── components/   # TopBar / Sidebar / Gantt / 面板 / 详情 / 弹窗 / 调试面板
├── electron.vite.config.ts
├── electron-builder.yml      # 打包配置
├── tsconfig.json
└── package.json
```

---

## 环境准备

| 依赖 | 版本要求 |
| --- | --- |
| Node.js | ≥ 20（开发时使用 v26 亦可） |
| npm | ≥ 10 |

> 数据库使用 **sql.js**（SQLite 编译为 WebAssembly），纯 JS 运行，**无需 Python、无需 MSVC C++ 工具链**，
> 在 Windows / macOS / Linux 上开箱即用，不会再触发 node-gyp 源码编译。

---

## 安装

```bash
npm install
```

无需任何原生编译步骤。若之前残留了 `better-sqlite3` / `node_modules`，建议先清干净再装：

```bash
rm -rf node_modules package-lock.json   # Windows: rmdir /s /q node_modules & del package-lock.json
npm install
```

---

## 调试（开发模式）

### 1. 启动开发模式

```bash
npm run dev
```

- electron-vite 提供渲染进程 **热更新（HMR）**：修改 `src/renderer` 下的代码即时生效；
  修改主进程 / preload 会触发应用自动重启。
- 开发模式下窗口打开时**自动弹出 DevTools**（F12 / Ctrl+Shift+I 也可切换）。

### 2. 应用内调试面板

点击顶栏右侧的 **⚙️** 打开调试面板，可查看：

- 运行信息：数据库文件路径、用户数据目录、Electron 版本、平台、是否打包
- 数据统计：人员 / 项目 / 任务 / 分配 / 书签 数量
- 「🧪 打开 DevTools」按钮
- 「♻️ 重置并填充调试数据」—— 一键清空并重建种子数据
- 「展开全量数据 (JSON)」—— 直接查看当前渲染进程持有的全量快照

### 3. 种子数据

首次启动（数据库为空）时自动写入一份演示数据，与 `plan.md` 中的示例一致：
3 个项目、4 名成员、11 个任务、依赖关系与书签（含「用户访谈」的完整书签时间线）。
数据库文件位于：

- Windows: `%APPDATA%/workline/workline.sqlite`
- macOS: `~/Library/Application Support/workline/workline.sqlite`
- Linux: `~/.config/workline/workline.sqlite`

### 4. 类型检查

```bash
npm run typecheck    # tsc --noEmit
```

### 5. 主进程调试（可选）

```bash
npm run dev -- --remote-debugging-port=9222
```

然后在 Chrome 打开 `chrome://inspect` 附加主进程，或在 VS Code 中配置
「Electron: Main」launch 配置（attach 到 9222）。

### 6. 常见问题排查

| 现象 | 原因 / 解决 |
| --- | --- |
| `npm install` 报 gyp/Python/MSVC 相关错误 | 说明装的是旧版依赖（`better-sqlite3`）。删除 `node_modules` 与 `package-lock.json` 后重新 `npm install`，本版本已改用 sql.js，无需编译 |
| `npm run dev` 启动即崩溃 | 打开终端看报错；确认 `npm run typecheck` 通过、`node_modules` 完整 |
| 白屏 | 打开 DevTools 查看 Console 报错 |
| 数据被改乱 | 调试面板点「♻️ 重置并填充调试数据」恢复 |
| 想彻底清库 | 退出应用后删除上述 `workline.sqlite` |

---

## 打包

```bash
npm run pack:win     # Windows (NSIS 安装包)
npm run pack:mac     # macOS (DMG)
npm run pack:linux   # Linux (AppImage + deb)
npm run pack:all     # 三个平台
npm run pack:portable  # windows便携版
```

产物输出到 `dist/`。数据库层为纯 JS/WASM（sql.js），打包无需任何原生模块重编译。

> 图标：`build/icon.ico`（Win）/ `build/icon.icns`（mac）/ `build/icon.png`（Linux）
> 未提供时 electron-builder 使用默认 Electron 图标，不影响打包。需要自定义图标时放入 `build/` 即可。

---

## 核心规则速览

**任务流转**（见 `src/shared/types.ts`）：

| 操作 | 前置条件 | 必填字段 |
| --- | --- | --- |
| 创建任务 | 无 | `status=REVIEW`，`statusUserId`=评审人 |
| 推进到开发 | 当前为 REVIEW | `toStatus=DEVELOPMENT`，指定开发者 |
| 推进到测试/验收 | 当前为 DEVELOPMENT | `toStatus=TESTING`，指定测试人 |
| 结束 | 当前为 TESTING | `toStatus=DONE`，指定确认人 |

**项目流转**：`立项 → 需求调研 → 进行中 → 结束`，任意阶段可 `挂起`，
`挂起` 可恢复或直接结束；每个阶段都有负责人。

**书签类型**：需求变更🔴 / 里程碑🟢 / 问题🟠 / 决策🔵 / 备注⚪。
