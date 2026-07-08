# growth-app 项目记忆

> 个人成长系统 — 把你的长期规划，变成每日可执行的一件事。
> Vite + Vue 3 + TypeScript + Pinia + Tailwind CSS + Supabase + PWA

## 项目结构

```
growth-app/
├── src/
│   ├── views/                  ← 页面组件
│   │   ├── GrowthDashboard.vue ← 总览（首页）
│   │   ├── LoginView.vue       ← 登录
│   │   ├── PlanTreeView.vue    ← 规划树
│   │   ├── DailyCheckIn.vue    ← 每日打卡
│   │   ├── HistoryView.vue     ← 追溯（5子页：日历/趋势/知识/洞察/搜索）
│   │   └── SettingsView.vue    ← 设置
│   ├── components/
│   │   ├── AppNav.vue          ← 底部导航（总览/规划/打卡/追溯）
│   │   └── PlanTreeNode.vue    ← 规划树递归节点
│   ├── stores/
│   │   ├── auth.ts             ← 登录态（与练题宝同一套Supabase Auth）
│   │   └── growth.ts           ← 成长系统全局状态
│   ├── utils/
│   │   ├── supabase.ts         ← Supabase客户端
│   │   └── growth-api.ts       ← 5张表的API+统计函数
│   ├── types.ts                ← 类型定义
│   ├── router/index.ts         ← 路由
│   ├── App.vue                 ← 根组件
│   ├── main.ts                 ← 入口
│   └── style.css               ← Tailwind + 自定义样式
├── supabase/
│   └── schema.sql              ← 5张 growth_* 表建表SQL
└── public/
    └── icon.svg                ← PWA图标
```

## 5张表（与练题宝 `bank_*` 隔离）

| 表 | 用途 | 关键字段 |
|------|------|---------|
| `growth_plans` | 规划树（愿景→年度→季度→周→日） | parent_id, level, area, progress, status, is_current |
| `growth_check_ins` | 每日打卡 | check_in_date唯一, energy_level, search_vector |
| `growth_questions` | 每日一问 | status, tags数组, search_vector |
| `growth_kr_progress` | KR进度历史 | kr_id + progress, 追加制 |
| `growth_articles` | 发文记录 | question_id外键, platform |

## 核心约定

- 与练题宝共用同一套 Supabase Auth，表前缀 `growth_*` 隔离
- 所有操作走 API 层（`growth-api.ts`），不在组件里直接查 Supabase
- 路由用 hash 模式，PWA 部署
- RLS 策略：`auth.uid() = uid`，单用户锁死

## 开发命令

```bash
npm install          # 装依赖
npm run dev          # 启动（手机同局域网可访问）
npm run build        # 构建
```

## 环境变量

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```
