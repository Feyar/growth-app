// ===================== 规划树 =====================
export type PlanLevel = 'vision' | 'annual' | 'quarterly' | 'monthly' | 'weekly' | 'daily'
export type PlanArea = 'career' | 'finance' | 'health' | 'family' | 'general'
export type PlanStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'abandoned'

export interface DailyTask {
  label: string
  icon?: string
  duration?: string
  source?: string
}

export interface PlanMeta {
  tasks?: DailyTask[]
  milestones?: string[]
  daily_breakdown?: Record<string, DailyTask[]>
  kr_id?: string
  kr_metrics?: string
  theme?: string
  [key: string]: unknown
}

export interface PlanNode {
  id: string
  uid: string
  parent_id: string | null
  level: PlanLevel
  area: PlanArea
  title: string
  description: string | null
  progress: number
  status: PlanStatus
  start_date: string | null
  end_date: string | null
  sort_order: number
  is_current: boolean
  archived: boolean
  meta: PlanMeta
  created_at: string
  updated_at: string
  children?: PlanNode[]
}

// ===================== 每日打卡 =====================
export interface CheckIn {
  id: string
  uid: string
  plan_id: string | null
  check_in_date: string
  completed_count: number
  total_count: number
  energy_level: number | null
  note: string | null
  archived: boolean
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ===================== 每日一问 =====================
export type QuestionStatus = 'pondering' | 'answered' | 'published' | 'abandoned'

export interface DailyQuestion {
  id: string
  uid: string
  question_date: string
  original_question: string
  ai_deepened: string | null
  my_answer: string | null
  status: QuestionStatus
  article_url: string | null
  tags: string[]
  archived: boolean
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ===================== KR进度记录 =====================
export interface KrProgress {
  id: string
  uid: string
  kr_id: string
  progress: number
  note: string | null
  created_at: string
}

// ===================== 文章记录 =====================
export type ArticlePlatform = 'csdn' | 'juejin' | 'zhihu' | 'other'
export type ArticleStatus = 'draft' | 'published' | 'abandoned'

export interface Article {
  id: string
  uid: string
  question_id: string | null
  title: string
  url: string | null
  platform: ArticlePlatform | null
  word_count: number | null
  published_at: string | null
  status: ArticleStatus
  archived: boolean
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ===================== 统计聚合 =====================
export interface StreakStats {
  current_streak: number
  longest_streak: number
  week_completed: number
  week_total: number
  month_completed: number
  month_total: number
}

export interface InsightData {
  day_of_week_break_rate: Record<number, number>
  weekly_trend: { week: string; count: number }[]
  longest_streak: number
  longest_break: number
}

export interface PipelineStats {
  total_questions: number
  answered: number
  published: number
}

export interface HeatmapDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}
