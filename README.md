# 星火 AI

一个 Windows Electron 客户端和用户后台工程骨架，包含 serverless 风格用户 API/数据库，以及可替换的计算内核适配层。

## 架构

- `apps/desktop`: Windows 客户端 UI，Electron + 前端页面，包含注册、登录、登录态保持、首页、设置、日志。
- `apps/admin`: 用户后台页面，可查看注册用户和客户端状态。
- `packages/backend`: 本地 serverless 风格 API，默认使用纯 Node JSON 数据库，方便 Windows 本地快速启动。生产环境建议换成 Turso、Cloudflare D1、Neon 或 Supabase。
- `packages/miner-core`: CPU/GPU 挖矿进程适配层。默认只提供可见、手动启动的进程封装和模拟模式。
- `data/app.json`: 本地开发用户数据库，首次启动 API 时自动创建。

## 运行

当前机器的系统 `node.exe` 被 Codex App 的 WindowsApps 路径抢占，`npm/git` 也不在 PATH。本项目已使用 `.tools/node` 便携 Node 作为本地开发运行时。

```powershell
npm install
npm run dev:api
npm run dev:desktop
npm run electron
```

用户后台：

```powershell
npm run dev:admin
```

也可以使用脚本：

```powershell
.\scripts\dev.ps1 install
.\scripts\dev.ps1 api
.\scripts\dev.ps1 desktop
.\scripts\dev.ps1 electron
.\scripts\dev.ps1 admin
```

## GitHub

本地仓库已经可以直接推送。若你已安装并登录 GitHub CLI：

```powershell
gh auth login
.\scripts\github.ps1 -Owner YOUR_GITHUB_NAME -Repo suanlibao
```

如果你已经在 GitHub 网页上建好了空仓库：

```powershell
.\scripts\github.ps1 -RemoteUrl https://github.com/YOUR_GITHUB_NAME/suanlibao.git
```

## 挖矿内核说明

工程只集成合法、透明、用户手动控制的内核适配能力，不包含隐藏运行、持久化驻留、规避检测或未经用户授权的行为。

可在 `apps/desktop/electron/miners.json` 配置官方内核路径：

- CPU XMR: XMRig
- GPU RVN: KawPowMiner / T-Rex / TeamRedMiner 等官方或可信发行版
- GPU CFX: lolMiner / BzMiner / NBMiner 等官方或可信发行版
- GPU PRL: 按目标币种实际算法选择对应官方内核

如果没有配置内核路径，客户端会以模拟模式写入日志，方便先完成 UI 和登录流程。
