# 🧭 成长系统

> 把你的长期规划，变成每日可执行的一件事。
> 规划树 · 每日打卡 · 每日一问 · 进度追溯

---

## 这是什么

一个连接**长期愿景 → 年度目标 → 季度OKR → 周计划 → 每日行动**的个人成长 PWA。

和练题宝共用同一套 Supabase Auth，数据表用 `growth_*` 前缀隔离，手机上两个独立 PWA 图标各司其职。

## 核心功能

### 📊 总览 Dashboard
- 连续天数 / 本周进度 / 本月累计 三张统计卡
- "你在这里"规划路径（从3年愿景到今天的面包屑）
- 本周7天打卡方块
- 今日任务 + 每日一问快捷入口

### 🌳 规划树
- 按领域筛选（职业/财务/健康/家庭）
- 无限层级展开/折叠
- 进度条 + 状态颜色 + "当前"标记

### ✅ 每日打卡
- 今日任务清单（可勾选）
- 每周7天进度方块
- 每日一问：记录 → AI深化 → 回答 → 状态追踪
- 能量状态选择（😞 😐 🙂 😊 😄）

### 📖 五种追溯视图
| 视图 | 功能 |
|------|------|
| 📅 日历热力图 | 按月查看打卡分布，颜色编码 |
| 📈 KR趋势 | 每个关键结果的进度变化曲线 |
| 🔄 知识流水线 | 问题→回答→文章的转化漏斗 |
| 🔍 洞察分析 | 中断模式识别、每周趋势、最长连续 |
| 🔎 全文搜索 | 搜索所有每日一问和打卡笔记 |

## 技术栈

- **前端**：Vue 3 + TypeScript + Pinia + Vue Router
- **样式**：Tailwind CSS
- **构建**：Vite 6
- **PWA**：vite-plugin-pwa（支持离线 + 安装到桌面）
- **后端**：Supabase（Auth + PostgreSQL）
- **部署**：Vercel

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 创建环境变量
cp .env.template .env.local
# 编辑 .env.local 填入你的 Supabase URL 和 anon key

# 3. 建表
# 去 Supabase 控制台 → SQL Editor → 运行 supabase/schema.sql

# 4. 启动开发服务器
npm run dev

# 5. 构建
npm run build
```

## 表结构

5张表，`growth_*` 前缀，与练题宝 `bank_*` 完全隔离：

| 表 | 用途 |
|------|------|
| `growth_plans` | 规划树节点（愿景→年度→季度→周→日） |
| `growth_check_ins` | 每日打卡记录 |
| `growth_questions` | 每日一问 |
| `growth_kr_progress` | KR进度历史（趋势线） |
| `growth_articles` | 发文记录（知识流水线终点） |

## 架构说明

```
同一个 Supabase 项目
├── bank_questions / bank_review_logs  ← 练题宝
├── growth_plans / growth_check_ins   ← 成长系统
├── profiles / projects / app_settings ← 共享基础表
└── Auth（同一套账号，登录一次两边通用）
```

两个 APP 代码各自独立仓库，数据通过表前缀隔离，共用一个登录。

## 项目结构

```
src/
├── views/               ← 页面（6个主页面）
├── components/          ← 组件（导航栏+树节点）
├── stores/              ← 状态管理（auth + growth）
├── utils/               ← 工具（Supabase + API层）
├── router/              ← 路由
├── types.ts             ← 类型定义
└── style.css            ← 全局样式

supabase/
└── schema.sql           ← 建表SQL（5张表）
```

## 相关链接

- [GitHub 仓库](https://github.com/Feyar/growth-app)
- [练题宝](https://github.com/Feyar/AI-lianxiti)
