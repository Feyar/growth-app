<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import type { HeatmapDay, DailyQuestion, CheckIn } from '@/types'

const auth = useAuthStore()
const growth = useGrowthStore()
const route = useRoute()
const router = useRouter()

// ── 子Tab ──
const tabs = [
  { key: 'calendar', label: '📅 日历', desc: '打卡分布' },
  { key: 'trend', label: '📈 趋势', desc: 'KR进度' },
  { key: 'pipeline', label: '🔄 知识', desc: '问题→文章' },
  { key: 'insights', label: '🔍 洞察', desc: '中断模式' },
  { key: 'search', label: '🔎 搜索', desc: '全文检索' },
]

const activeTab = computed(() => {
  const p = route.path
  if (p.includes('calendar')) return 'calendar'
  if (p.includes('trend')) return 'trend'
  if (p.includes('pipeline')) return 'pipeline'
  if (p.includes('insights')) return 'insights'
  if (p.includes('search')) return 'search'
  return 'calendar'
})

function switchTab(key: string) {
  router.push(`/history/${key}`)
}

// ── 日历热力图 ──
const heatmapYear = ref(2026)
const heatmapMonth = ref(new Date().getMonth() + 1)
const heatmapData = ref<HeatmapDay[]>([])
const hoverDay = ref<HeatmapDay | null>(null)

async function loadHeatmap() {
  heatmapData.value = await growth.loadHeatmap(heatmapYear.value, heatmapMonth.value)
}

const monthHeatmap = computed(() => {
  const days = heatmapData.value
  const weeks: (HeatmapDay | null)[][] = []
  if (days.length === 0) return weeks

  const firstDay = new Date(days[0].date).getDay()
  let week: (HeatmapDay | null)[] = []
  for (let i = 0; i < firstDay; i++) week.push(null)
  for (const day of days) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week as HeatmapDay[])
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week as HeatmapDay[])
  }
  return weeks
})

const monthTotal = computed(() => heatmapData.value.filter(d => d.count > 0).length)

function prevMonth() {
  if (heatmapMonth.value === 1) { heatmapMonth.value = 12; heatmapYear.value-- }
  else heatmapMonth.value--
  loadHeatmap()
}

function nextMonth() {
  if (heatmapMonth.value === 12) { heatmapMonth.value = 1; heatmapYear.value++ }
  else heatmapMonth.value++
  loadHeatmap()
}

// ── 知识流水线 ──
const articleTitle = ref('')
const articleUrl = ref('')
const articlePlatform = ref('juejin')

async function markAsPublished(q: DailyQuestion) {
  if (!articleTitle.value.trim()) return
  await growth.saveQuestion({
    ...q,
    status: 'published',
    article_url: articleUrl.value || null,
  })
  await growth.loadQuestions()
  articleTitle.value = ''
  articleUrl.value = ''
}

// ── 洞察分析 ──
const insights = ref<any>(null)
const loadingInsights = ref(false)

async function loadInsights() {
  loadingInsights.value = true
  insights.value = await growth.loadInsights()
  loadingInsights.value = false
}

const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ── 搜索 ──
const searchQuery = ref('')
const searchResults = ref<{ questions: DailyQuestion[]; notes: CheckIn[] }>({ questions: [], notes: [] })
const searching = ref(false)

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  searchResults.value = await growth.search(searchQuery.value)
  searching.value = false
}

onMounted(async () => {
  if (!auth.isLoggedIn()) return
  if (activeTab.value === 'calendar') await loadHeatmap()
  await growth.loadAll()
})

// Watch tab changes
import { watch } from 'vue'
watch(activeTab, async (tab) => {
  if (tab === 'calendar') await loadHeatmap()
  if (tab === 'insights') await loadInsights()
  if (tab === 'pipeline') await growth.loadQuestions()
})
</script>

<template>
  <div v-if="!auth.isLoggedIn()" class="flex flex-col items-center justify-center min-h-[60vh] px-6">
    <p class="text-muted text-sm">请先登录</p>
    <router-link to="/login" class="btn-ghost mt-3">登录</router-link>
  </div>

  <div v-else class="px-4 pt-2 pb-6 animate-fade-in">
    <!-- 子Tab导航 -->
    <div class="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="switchTab(tab.key)"
        class="shrink-0 text-xs px-3 py-2 rounded-xl transition-all duration-150 flex flex-col items-center"
        :class="activeTab === tab.key ? 'bg-accent border-accent text-accent' : 'bg-card text-muted border-subtle border'"
      >
        <span>{{ tab.label }}</span>
        <span class="text-[9px] opacity-60">{{ tab.desc }}</span>
      </button>
    </div>

    <!-- ─── 日历热力图 ─── -->
    <div v-if="activeTab === 'calendar'" class="card animate-fade-in">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="text-muted text-sm px-2">◀</button>
        <span class="text-sm font-medium text-primary">{{ heatmapYear }}年{{ heatmapMonth }}月</span>
        <button @click="nextMonth" class="text-muted text-sm px-2">▶</button>
      </div>

      <!-- 图例 -->
      <div class="flex items-center gap-1 mb-3 justify-end">
        <span class="text-[9px] text-muted">少</span>
        <div class="w-3 h-3 rounded heat-0"></div>
        <div class="w-3 h-3 rounded heat-1"></div>
        <div class="w-3 h-3 rounded heat-2"></div>
        <div class="w-3 h-3 rounded heat-3"></div>
        <div class="w-3 h-3 rounded heat-4"></div>
        <span class="text-[9px] text-muted">多</span>
      </div>

      <div class="text-xs text-muted mb-2">本月完成：{{ monthTotal }}天</div>

      <!-- 热力图 -->
      <div v-if="monthHeatmap.length > 0">
        <div class="flex gap-1 mb-1">
          <div class="w-7 shrink-0"></div>
          <div v-for="l in ['一','二','三','四','五','六','日']" :key="l" class="text-[9px] text-muted text-center w-[calc((100%-28px)/7)]">
            {{ l }}
          </div>
        </div>
        <div v-for="(week, wi) in monthHeatmap" :key="wi" class="flex gap-1 mb-1">
          <div class="w-7 text-[9px] text-muted flex items-center">{{ wi + 1 }}</div>
          <div
            v-for="(day, di) in week"
            :key="di"
            class="w-[calc((100%-28px)/7)] aspect-square rounded-md flex items-center justify-center text-[9px] cursor-pointer transition-all"
            :class="day ? `heat-${day.level}` : 'bg-transparent'"
            @mouseenter="hoverDay = day"
            @mouseleave="hoverDay = null"
          >
            <span v-if="day && day.count > 0" class="text-white/60">{{ new Date(day.date).getDate() }}</span>
            <span v-else-if="day" class="text-muted/40">{{ new Date(day.date).getDate() }}</span>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-6 text-muted text-sm">暂无打卡数据</div>

      <!-- 悬浮详情 -->
      <div v-if="hoverDay" class="mt-3 p-2 bg-elevated rounded-lg text-xs text-secondary animate-fade-in">
        {{ hoverDay.date }} — 完成 {{ hoverDay.count }} 项
      </div>
    </div>

    <!-- ─── 趋势图 ─── -->
    <div v-if="activeTab === 'trend'" class="animate-fade-in">
      <div class="card">
        <div class="text-sm font-medium text-primary mb-3">📈 KR进度趋势</div>
        <p class="text-xs text-muted">选择一个KR查看其进度变化曲线（记录进度后自动生成）</p>
        <div class="text-center py-8 text-muted text-sm">
          暂无进度数据 — 开始在规划中记录KR进度吧
        </div>
      </div>
    </div>

    <!-- ─── 知识流水线 ─── -->
    <div v-if="activeTab === 'pipeline'" class="space-y-4 animate-fade-in">
      <!-- 漏斗 -->
      <div class="card">
        <div class="text-sm font-medium text-primary mb-3">🔄 知识流水线</div>
        <div class="flex items-end justify-center gap-4 py-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary">{{ growth.pipelineStats.total_questions }}</div>
            <div class="text-xs text-muted">💡 提问</div>
          </div>
          <div class="text-2xl text-muted">→</div>
          <div class="text-center">
            <div class="text-2xl font-bold text-success">{{ growth.pipelineStats.answered }}</div>
            <div class="text-xs text-muted">✅ 已回答</div>
          </div>
          <div class="text-2xl text-muted">→</div>
          <div class="text-center">
            <div class="text-2xl font-bold text-accent">{{ growth.pipelineStats.published }}</div>
            <div class="text-xs text-muted">📝 已发文</div>
          </div>
        </div>
      </div>

      <!-- 待转化 -->
      <div v-if="growth.unansweredQuestions.length > 0" class="card">
        <div class="text-sm font-medium text-primary mb-3">✍️ 已回答·待发文</div>
        <div class="space-y-2">
          <div v-for="q in growth.unansweredQuestions.slice(0, 5)" :key="q.id" class="p-3 bg-elevated rounded-xl">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-secondary">{{ q.original_question }}</p>
                <p class="text-[10px] text-muted mt-0.5">{{ q.question_date }} • 已回答</p>
              </div>
              <button
                @click="markAsPublished(q)"
                class="shrink-0 text-[10px] px-2 py-1 bg-accent text-accent rounded-full"
              >
                发文
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 所有问题 -->
      <div class="card">
        <div class="text-sm font-medium text-primary mb-3">📋 所有问题</div>
        <div v-if="growth.questions.length > 0" class="space-y-2">
          <div v-for="q in growth.questions.slice(0, 20)" :key="q.id" class="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg-elevated)]">
            <span class="text-sm shrink-0">
              {{ q.status === 'published' ? '📝' : q.status === 'answered' ? '✅' : '💡' }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-secondary truncate">{{ q.original_question }}</p>
              <p class="text-[10px] text-muted">{{ q.question_date }}</p>
            </div>
            <a v-if="q.article_url" :href="q.article_url" target="_blank" class="text-[10px] text-accent shrink-0">查看</a>
          </div>
        </div>
        <div v-else class="text-center py-6 text-muted text-sm">暂无问题记录</div>
      </div>
    </div>

    <!-- ─── 洞察分析 ─── -->
    <div v-if="activeTab === 'insights'" class="space-y-4 animate-fade-in">
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-primary">🔍 中断模式分析</span>
          <button @click="loadInsights" class="text-xs text-accent">刷新</button>
        </div>

        <div v-if="loadingInsights" class="text-center py-6 text-muted text-sm">分析中...</div>

        <div v-else-if="insights" class="space-y-4">
          <!-- 每日中断率 -->
          <div>
            <div class="text-xs text-muted mb-2">每周各天中断率（越高越容易断）</div>
            <div class="space-y-1.5">
              <div v-for="(rate, i) in insights.day_of_week_break_rate" :key="i" class="flex items-center gap-2">
                <span class="text-[10px] text-muted w-8">{{ dayLabels[i] }}</span>
                <div class="flex-1 h-3 bg-elevated rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="rate > 50 ? 'bg-danger' : rate > 30 ? 'text-accent' : 'text-success'"
                    :style="{ width: rate + '%', backgroundColor: rate > 50 ? 'var(--danger)' : rate > 30 ? 'var(--accent)' : 'var(--success)' }"
                  ></div>
                </div>
                <span class="text-[10px] text-muted w-8 text-right">{{ rate }}%</span>
              </div>
            </div>
          </div>

          <!-- 每周趋势 -->
          <div>
            <div class="text-xs text-muted mb-2">每周完成天数趋势</div>
            <div class="flex items-end gap-1 h-20">
              <div
                v-for="w in insights.weekly_trend.slice(-8)"
                :key="w.week"
                class="flex-1 flex flex-col items-center gap-0.5"
              >
                <div
                  class="w-full rounded-t transition-all duration-500"
                  :style="{ height: (w.count / 7 * 100) + '%', backgroundColor: w.count >= 3 ? 'var(--accent)' : 'var(--text-muted)' }"
                ></div>
                <span class="text-[8px] text-muted">{{ w.week.slice(-2) }}</span>
              </div>
            </div>
          </div>

          <!-- 关键指标 -->
          <div class="grid grid-cols-2 gap-3">
            <div class="stat-card">
              <div class="text-lg font-bold text-success">{{ insights.longest_streak }}天</div>
              <div class="stat-label">最长连续</div>
            </div>
            <div class="stat-card">
              <div class="text-lg font-bold text-danger">{{ insights.longest_break }}天</div>
              <div class="stat-label">最长中断</div>
            </div>
          </div>

          <div v-if="insights.day_of_week_break_rate[4] > 50" class="p-3 bg-accent rounded-xl border border-accent">
            <p class="text-xs text-accent">💡 建议：你周四断的概率较高，可以考虑把周四的最小动作提前到早上做掉</p>
          </div>
        </div>

        <div v-else class="text-center py-6 text-muted text-sm">
          暂无足够数据进行分析 — 需要至少2周打卡记录
        </div>
      </div>
    </div>

    <!-- ─── 搜索 ─── -->
    <div v-if="activeTab === 'search'" class="space-y-4 animate-fade-in">
      <div class="card">
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            placeholder="搜索你的记录... 例如：达梦、国密、RAG"
            class="flex-1 bg-input border border-subtle rounded-xl px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          <button
            @click="handleSearch"
            :disabled="searching"
            class="btn-primary text-sm px-4 py-2"
          >
            {{ searching ? '...' : '🔍' }}
          </button>
        </div>
      </div>

      <div v-if="searchResults.questions.length > 0 || searchResults.notes.length > 0" class="space-y-3">
        <div v-if="searchResults.questions.length > 0" class="card">
          <div class="text-xs font-medium text-muted mb-2">💡 每日一问（{{ searchResults.questions.length }}）</div>
          <div class="space-y-2">
            <div v-for="q in searchResults.questions" :key="q.id" class="p-2 hover:bg-[var(--bg-elevated)] rounded-lg">
              <p class="text-xs text-secondary">{{ q.original_question }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ q.question_date }} · {{ q.status === 'published' ? '已发文' : q.status === 'answered' ? '已回答' : '思考中' }}</p>
            </div>
          </div>
        </div>

        <div v-if="searchResults.notes.length > 0" class="card">
          <div class="text-xs font-medium text-muted mb-2">📝 打卡笔记（{{ searchResults.notes.length }}）</div>
          <div class="space-y-2">
            <div v-for="n in searchResults.notes" :key="n.id" class="p-2 hover:bg-[var(--bg-elevated)] rounded-lg">
              <p class="text-xs text-secondary">{{ n.note || '(无笔记)' }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ n.check_in_date }} · 完成 {{ n.completed_count }}/{{ n.total_count }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="searchQuery && !searching" class="text-center py-6 text-muted text-sm">
        未找到相关记录
      </div>
    </div>
  </div>
</template>
