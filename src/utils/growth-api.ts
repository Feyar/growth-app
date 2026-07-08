import { supabase, supabaseEnabled } from './supabase'
import type { PlanNode, CheckIn, DailyQuestion, KrProgress, Article, HeatmapDay } from '@/types'

// ===================== 规划树 API =====================
export async function fetchPlanTree(): Promise<PlanNode[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data } = await supabase
    .from('growth_plans')
    .select('*')
    .eq('archived', false)
    .order('sort_order')
  return (data as PlanNode[]) || []
}

export async function upsertPlan(plan: Partial<PlanNode>): Promise<PlanNode | null> {
  if (!supabaseEnabled || !supabase) return null
  const { data } = await supabase
    .from('growth_plans')
    .upsert(plan)
    .select()
    .single()
  return data as PlanNode | null
}

export async function updatePlanProgress(id: string, progress: number): Promise<void> {
  if (!supabaseEnabled || !supabase) return
  await supabase.from('growth_plans').update({ progress }).eq('id', id)
}

// ===================== 每日打卡 API =====================
export async function fetchCheckIns(startDate: string, endDate: string): Promise<CheckIn[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data } = await supabase
    .from('growth_check_ins')
    .select('*')
    .gte('check_in_date', startDate)
    .lte('check_in_date', endDate)
    .eq('archived', false)
    .order('check_in_date', { ascending: false })
  return (data as CheckIn[]) || []
}

export async function fetchTodayCheckIn(date: string): Promise<CheckIn | null> {
  if (!supabaseEnabled || !supabase) return null
  const { data } = await supabase
    .from('growth_check_ins')
    .select('*')
    .eq('check_in_date', date)
    .single()
  return data as CheckIn | null
}

export async function upsertCheckIn(checkIn: Partial<CheckIn>): Promise<CheckIn | null> {
  if (!supabaseEnabled || !supabase) return null
  const { data } = await supabase
    .from('growth_check_ins')
    .upsert(checkIn, { onConflict: 'uid,check_in_date' })
    .select()
    .single()
  return data as CheckIn | null
}

// ===================== 每日一问 API =====================
export async function fetchQuestions(limit = 50): Promise<DailyQuestion[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data } = await supabase
    .from('growth_questions')
    .select('*')
    .eq('archived', false)
    .order('question_date', { ascending: false })
    .limit(limit)
  return (data as DailyQuestion[]) || []
}

export async function fetchTodayQuestion(date: string): Promise<DailyQuestion | null> {
  if (!supabaseEnabled || !supabase) return null
  const { data } = await supabase
    .from('growth_questions')
    .select('*')
    .eq('question_date', date)
    .single()
  return data as DailyQuestion | null
}

export async function upsertQuestion(q: Partial<DailyQuestion>): Promise<DailyQuestion | null> {
  if (!supabaseEnabled || !supabase) return null
  const { data } = await supabase
    .from('growth_questions')
    .upsert(q, { onConflict: 'uid,question_date' })
    .select()
    .single()
  return data as DailyQuestion | null
}

// ===================== KR进度 API =====================
export async function fetchKrProgress(krId: string): Promise<KrProgress[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data } = await supabase
    .from('growth_kr_progress')
    .select('*')
    .eq('kr_id', krId)
    .order('created_at')
  return (data as KrProgress[]) || []
}

export async function recordKrProgress(krId: string, progress: number, note?: string): Promise<void> {
  if (!supabaseEnabled || !supabase) return
  await supabase.from('growth_kr_progress').insert({ kr_id: krId, progress, note })
}

// ===================== 文章 API =====================
export async function fetchArticles(): Promise<Article[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data } = await supabase
    .from('growth_articles')
    .select('*')
    .eq('archived', false)
    .order('published_at', { ascending: false })
  return (data as Article[]) || []
}

// ===================== 统计 API =====================
export async function fetchStreakStats(): Promise<{
  current_streak: number
  longest_streak: number
  week_completed: number
  month_completed: number
}> {
  if (!supabaseEnabled || !supabase) {
    return { current_streak: 0, longest_streak: 0, week_completed: 0, month_completed: 0 }
  }

  const now = new Date()
  const today = toDateStr(now)
  const weekAgo = toDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const monthAgo = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()))

  const { data: allData } = await supabase
    .from('growth_check_ins')
    .select('check_in_date, completed_count')
    .gte('check_in_date', monthAgo)
    .eq('archived', false)
    .order('check_in_date', { ascending: false })

  if (!allData) return { current_streak: 0, longest_streak: 0, week_completed: 0, month_completed: 0 }

  const checkins = allData as { check_in_date: string; completed_count: number }[]
  const completedDates = new Set(checkins.filter(c => c.completed_count > 0).map(c => c.check_in_date))

  // Continuous streak
  let current = 0
  const d = new Date(today)
  while (completedDates.has(toDateStr(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }

  // Longest streak
  let longest = 0
  let streak = 0
  const sorted = [...completedDates].sort()
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || daysDiff(sorted[i - 1], sorted[i]) === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak)

  // Week count
  const weekDates = checkins.filter(c => c.check_in_date >= weekAgo && c.completed_count > 0)

  // Month count
  const monthDates = checkins.filter(c => c.completed_count > 0)

  return {
    current_streak: current,
    longest_streak: longest,
    week_completed: weekDates.length,
    month_completed: monthDates.length,
  }
}

// ===================== 热力图数据 =====================
export async function fetchHeatmapData(year: number, month?: number): Promise<HeatmapDay[]> {
  if (!supabaseEnabled || !supabase) return []

  let start: Date, end: Date
  const now = new Date()
  if (month !== undefined) {
    start = new Date(year, month - 1, 1)
    end = new Date(year, month, 0)
  } else {
    start = new Date(year, 0, 1)
    end = new Date(year, 11, 31)
  }

  const { data } = await supabase
    .from('growth_check_ins')
    .select('check_in_date, completed_count')
    .gte('check_in_date', toDateStr(start))
    .lte('check_in_date', toDateStr(end))
    .eq('archived', false)

  if (!data) return []

  const map = new Map<string, number>()
  for (const d of data as { check_in_date: string; completed_count: number }[]) {
    map.set(d.check_in_date, d.completed_count)
  }

  const result: HeatmapDay[] = []
  const d = new Date(start)
  while (d <= end) {
    const key = toDateStr(d)
    const count = map.get(key) || 0
    result.push({
      date: key,
      count,
      level: count === 0 ? 0 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 3 ? 3 : 4,
    })
    d.setDate(d.getDate() + 1)
  }

  return result
}

// ===================== 全文搜索 =====================
export async function searchAll(query: string): Promise<{
  questions: DailyQuestion[]
  notes: CheckIn[]
}> {
  if (!supabaseEnabled || !supabase || !query.trim()) {
    return { questions: [], notes: [] }
  }

  const searchTerm = query.trim()

  const { data: questions } = await supabase
    .from('growth_questions')
    .select('*')
    .textSearch('search_vector', searchTerm, { type: 'plain' })
    .limit(20)

  const { data: notes } = await supabase
    .from('growth_check_ins')
    .select('*')
    .textSearch('search_vector', searchTerm, { type: 'plain' })
    .limit(20)

  return {
    questions: (questions as DailyQuestion[]) || [],
    notes: (notes as CheckIn[]) || [],
  }
}

// ===================== 工具函数 =====================
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000))
}
