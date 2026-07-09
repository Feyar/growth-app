# growth-app 项目记忆

> 个人人生系统 — 把你的长期规划，变成每日可执行的一件事。
> Vite + Vue 3 + TypeScript + Pinia + Tailwind CSS + Supabase + PWA

## 项目概况

- **是什么**：Obsidian 人生系统的移动端展示与交互界面。数据从 `02_Wiki【结构化知识库】/00-个人成长系统/` 同步到 Supabase，PWA 读取 Supabase 展示。
- **技术栈**：Vue 3 + Vite + TypeScript + Pinia + Vue Router + Tailwind CSS + vite-plugin-pwa + suncalc
- **部署**：待部署

## 当前状态（2026-07-09 改造后）

### 新增/改造功能
- **🌗 自动明暗模式**：基于 `suncalc` + 北京坐标计算日出日落，自动切换 light/dark 主题（CSS 变量体系）
- **🔗 Obsidian 同步**：`scripts/sync-plans.ts` 读取 Wiki 生长系统文件 → 解析 → upsert Supabase；`.githooks/post-commit` 在 Wiki 文件提交时自动触发
- **✅ 每日任务**：`DailyCheckIn.vue` 从 `growth.plans` 读取 daily 级别的规划节点任务，不再硬编码
- **⚙️ 设置页**：参考练题宝模式，展示同步状态 + 刷新数据按钮

## 项目结构

```
growth-app/
├── src/
│   ├── composables/
│   │   └── useTheme.ts        ← 日出日落主题计算
│   ├── views/
│   │   ├── GrowthDashboard.vue ← 总览
│   │   ├── LoginView.vue       ← 登录
│   │   ├── PlanTreeView.vue    ← 规划树
│   │   ├── DailyCheckIn.vue    ← 每日打卡（从规划树读任务）
│   │   ├── HistoryView.vue     ← 追溯
│   │   └── SettingsView.vue    ← 设置（含同步状态）
│   ├── components/
│   │   ├── AppNav.vue          ← 底部导航
│   │   └── PlanTreeNode.vue    ← 规划树递归节点
│   ├── stores/
│   │   ├── auth.ts             ← 登录态
│   │   └── growth.ts           ← 全局状态
│   ├── utils/
│   │   ├── supabase.ts         ← Supabase客户端
│   │   └── growth-api.ts       ← API层 + 统计函数
│   ├── types.ts                ← 类型定义（含 PlanMeta/DailyTask）
│   ├── router/index.ts         ← 路由
│   └── style.css               ← CSS变量体系 + 双主题
├── scripts/
│   ├── sync-plans.ts           ← Obsidian→Supabase同步脚本
│   └── sync-plans.config.ts    ← 同步配置
├── supabase/
│   └── schema.sql              ← 建表SQL
└── .env.template               ← 环境变量模板
```

## 5张表（与练题宝 `bank_*` 隔离）

| 表 | 用途 | 关键字段 |
|------|------|---------|
| `growth_plans` | 规划树（愿景→年度→季度→周→日） | parent_id, level, area, progress, status, is_current, meta (含 tasks/milestones) |
| `growth_check_ins` | 每日打卡 | check_in_date唯一, energy_level |
| `growth_questions` | 每日一问 | status, tags数组 |
| `growth_kr_progress` | KR进度历史 | kr_id + progress, 追加制 |
| `growth_articles` | 发文记录 | question_id外键 |

## 数据流

```
Obsidian Wiki (02_Wiki/00-个人成长系统/)
    │
    ▼ (npm run sync:plans / git post-commit hook)
    │
Supabase (growth_* 表)
    │
    ▼ (PWA 启动 / 手动 refresh)
    │
growth-app (Vue 前端)
```

## 同步脚本用法

```bash
# 1. 配置 .env.local（复制 .env.template 后填写真实值）
cp .env.template .env.local
# 编辑 .env.local 填入 Supabase URL / anon key / 登录账号

# 2. 手动同步
npm run sync:plans:local

# 3. 或直接通过 git commit 自动触发
# 修改 02_Wiki/00-个人成长系统/ 下的文件后 commit 即可
```

## 主题系统

- 使用 CSS 自定义属性（`--bg-card`, `--text-primary` 等）+ HTML `data-theme` class
- 默认坐标：北京（39.9°N, 116.4°E）
- 日出前30min→日落后30min = light，其余 = dark
- 过渡动画 0.6s ease
- 所有颜色相关 class 已迁移为 CSS 变量

## 核心约定

- 与练题宝共用同一套 Supabase Auth，表前缀 `growth_*` 隔离
- 所有操作走 API 层（`growth-api.ts`），不在组件里直接查 Supabase
- 路由用 hash 模式，PWA 部署
- RLS 策略：`auth.uid() = uid`，单用户锁死

## 开发命令

```bash
npm install          # 装依赖
npm run dev          # 启动
npm run build        # 构建
npm run sync:plans:local  # 手动同步规划数据
```

## 环境变量

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
VITE_SYNC_EMAIL=your@email.com
VITE_SYNC_PASSWORD=your_password
```
