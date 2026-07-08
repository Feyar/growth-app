import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanNode, CheckIn, DailyQuestion, StreakStats, HeatmapDay, InsightData, PipelineStats, Article } from '@/types'
import {
  fetchPlanTree, fetchCheckIns, fetchTodayCheckIn, upsertCheckIn,
  fetchQuestions, fetchTodayQuestion, upsertQuestion,
  fetchStreakStats, fetchHeatmapData,
  fetchArticles, searchAll,
} from '@/utils/growth-api'

export const useGrowthStore = defineStore('growth', () => {
  // ── 状态 ──
  const plans = ref<PlanNode[]>([])
  const checkIns = ref<CheckIn[]>([])
  const todayCheckIn = ref<CheckIn | null>(null)
  const questions = ref<DailyQuestion[]>([])
  const articles = ref<Article[]>([])
  const stats = ref<StreakStats>({ current_streak: 0, longest_streak: 0, week_completed: 0, week_total: 7, month_completed: 0, month_total: 30 })
  const heatmapData = ref<HeatmapDay[]>([])
  const loading = ref(false)

  // ── 计算属性 ──
  const currentPlanPath = computed(() => {
    const path: PlanNode[] = []
    let current = plans.value.find(p => p.is_current && p.level === 'quarterly')
    if (!current) return path

    const findParent = (child: PlanNode, all: PlanNode[]): PlanNode | undefined =>
      all.find(p => p.id === child.parent_id)

    let node: PlanNode | undefined = current
    while (node) {
      path.unshift(node)
      node = findParent(node, plans.value)
    }
    return path
  })

  const today = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // ── 操作 ──
  async function loadPlans() {
    plans.value = await fetchPlanTree()
  }

  async function loadCheckIns() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    checkIns.value = await fetchCheckIns(
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    )
  }

  async function loadToday() {
    todayCheckIn.value = await fetchTodayCheckIn(today())
  }

  async function loadQuestions() {
    questions.value = await fetchQuestions(100)
  }

  async function loadStats() {
    stats.value = { ...stats.value, ...(await fetchStreakStats()) }
  }

  async function loadHeatmap(year: number, month?: number) {
    heatmapData.value = await fetchHeatmapData(year, month)
    return heatmapData.value
  }

  async function checkIn(completedCount: number, totalCount: number, energyLevel?: number, note?: string) {
    const result = await upsertCheckIn({
      check_in_date: today(),
      completed_count: completedCount,
      total_count: totalCount,
      energy_level: energyLevel ?? null,
      note: note ?? null,
    })
    if (result) todayCheckIn.value = result
    await loadStats()
  }

  async function saveQuestion(q: Partial<DailyQuestion>) {
    return await upsertQuestion(q)
  }

  async function loadAll() {
    loading.value = true
    await Promise.all([loadPlans(), loadCheckIns(), loadToday(), loadQuestions(), loadStats()])
    loading.value = false
  }

  async function loadArticles() {
    articles.value = await fetchArticles()
  }

  // ── 洞察分析数据 ──
  async function loadInsights(): Promise<InsightData | null> {
    const d = new Date()
    const yearAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
    const start = `${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, '0')}-${String(yearAgo.getDate()).padStart(2, '0')}`
    const end = today()
    const data = await fetchCheckIns(start, end)
    if (!data.length) return null

    // Day of week break rate
    const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0]
    const dayBreaks: number[] = [0, 0, 0, 0, 0, 0, 0]
    data.forEach(c => {
      const day = new Date(c.check_in_date).getDay()
      dayTotals[day]++
      if (c.completed_count === 0) dayBreaks[day]++
    })
    const dayOfWeekBreakRate: Record<number, number> = {}
    dayTotals.forEach((total, i) => {
      dayOfWeekBreakRate[i] = total > 0 ? Math.round((dayBreaks[i] / total) * 100) : 0
    })

    // Weekly trend
    const weekMap = new Map<string, number>()
    data.forEach(c => {
      const d2 = new Date(c.check_in_date)
      const weekStart = new Date(d2)
      weekStart.setDate(d2.getDate() - d2.getDay())
      const key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`
      weekMap.set(key, (weekMap.get(key) || 0) + (c.completed_count > 0 ? 1 : 0))
    })
    const weeklyTrend = Array.from(weekMap.entries()).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week))

    // Longest streak & break
    const completed = data.filter(c => c.completed_count > 0).map(c => c.check_in_date).sort()
    let longestStreak = 0
    let curStreak = 0
    let longestBreak = 0
    let curBreak = 0
    for (let i = 0; i < completed.length; i++) {
      if (i === 0 || daysDiff(completed[i - 1], completed[i]) === 1) {
        curStreak++
        curBreak = 0
      } else {
        longestStreak = Math.max(longestStreak, curStreak)
        curBreak = daysDiff(completed[i - 1], completed[i]) - 1
        longestBreak = Math.max(longestBreak, curBreak)
        curStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, curStreak)

    return { day_of_week_break_rate: dayOfWeekBreakRate, weekly_trend: weeklyTrend, longest_streak: longestStreak, longest_break: longestBreak }
  }

  // ── 知识流水线统计 ──
  const pipelineStats = computed<PipelineStats>(() => {
    const qs = questions.value
    return {
      total_questions: qs.length,
      answered: qs.filter(q => q.status === 'answered' || q.status === 'published').length,
      published: qs.filter(q => q.status === 'published').length,
    }
  })

  const unansweredQuestions = computed(() =>
    questions.value.filter(q => q.status === 'answered' && !q.article_url)
  )

  // Search
  async function search(query: string) {
    return await searchAll(query)
  }

  return {
    plans, checkIns, todayCheckIn, questions, articles, stats, heatmapData, loading,
    currentPlanPath, pipelineStats, unansweredQuestions, today,
    loadPlans, loadCheckIns, loadToday, loadQuestions, loadStats, loadHeatmap, loadAll, loadArticles,
    checkIn, saveQuestion, loadInsights, search,
  }
})

function daysDiff(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000))
}
