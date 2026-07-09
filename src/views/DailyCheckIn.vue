<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'

const auth = useAuthStore()
const growth = useGrowthStore()
const route = useRoute()

// ── 当前日期 ──
const today = ref(new Date())
const dateStr = computed(() => {
  const d = route.params.date ? new Date(route.params.date as string) : today.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const dateLabel = computed(() => {
  const d = route.params.date ? new Date(route.params.date as string) : today.value
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`
})

const isToday = computed(() => {
  return dateStr.value === growth.today()
})

// ── 任务：从规划树读取今日 daily 节点 ──
interface Task {
  id: number
  label: string
  icon: string
  duration: string
  done: boolean
}

const tasks = ref<Task[]>([])

function loadDailyTasks() {
  const raw = growth.getDailyTasks(dateStr.value)
  tasks.value = raw.map((t, i) => ({
    id: i + 1,
    label: t.label,
    icon: t.icon || '📋',
    duration: t.duration || '',
    done: false,
  }))
}

const completedCount = computed(() => tasks.value.filter(t => t.done).length)
const allDone = computed(() => completedCount.value === tasks.value.length && tasks.value.length > 0)

function toggleTask(id: number) {
  const task = tasks.value.find(t => t.id === id)
  if (task) {
    task.done = !task.done
    if (isToday.value) {
      growth.checkIn(completedCount.value, tasks.value.length)
    }
  }
}

// ── 每日一问 ──
const questionText = ref('')
const deepenedText = ref('')
const answerText = ref('')
const questionStatus = ref<'pondering' | 'answered' | 'published'>('pondering')
const showDeepened = ref(false)

async function handleAskAI() {
  if (!questionText.value.trim()) return
  showDeepened.value = true
  deepenedText.value = 'AI 思考中...'
  try {
    const res = await fetch('/api/deepen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: questionText.value }),
    })
    const data = await res.json()
    deepenedText.value = data.deepened || '暂无深化结果'
  } catch {
    deepenedText.value = '网络错误，请稍后再试'
  }
}

async function saveQuestion() {
  if (!questionText.value.trim()) return
  await growth.saveQuestion({
    question_date: dateStr.value,
    original_question: questionText.value,
    ai_deepened: deepenedText.value,
    my_answer: answerText.value || null,
    status: questionStatus.value,
  })
}

// ── 打卡按钮 ──
const checkInDone = ref(false)
const energyLevel = ref(3)

async function handleCheckIn() {
  if (!isToday.value) return
  checkInDone.value = true
  await growth.checkIn(completedCount.value, tasks.value.length, energyLevel.value)
}

// ── 本周进度 ──
const weekDays = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const checkIn = growth.checkIns.find(c => c.check_in_date === key)
    days.push({
      label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      done: checkIn ? checkIn.completed_count > 0 : false,
      today: key === growth.today(),
    })
  }
  return days
})

onMounted(async () => {
  if (!auth.isLoggedIn()) return
  await growth.loadAll()
  loadDailyTasks()
  // 从已保存的打卡记录恢复 UI 状态
  if (growth.todayCheckIn) {
    checkInDone.value = true
    energyLevel.value = growth.todayCheckIn.energy_level || 3
  }
})
</script>

<template>
  <div v-if="!auth.isLoggedIn()" class="flex flex-col items-center justify-center min-h-[60vh] px-6">
    <p class="text-muted text-sm">请先登录</p>
    <router-link to="/login" class="btn-ghost mt-3">登录</router-link>
  </div>

  <div v-else class="px-4 pt-2 pb-6 space-y-4 animate-fade-in">
    <!-- 日期 + 精力 -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-sm font-medium text-primary">{{ dateLabel }}</div>
          <span v-if="!isToday" class="text-xs text-muted">查看历史记录</span>
        </div>
        <div v-if="isToday" class="flex gap-1">
          <button
            v-for="i in 5"
            :key="i"
            @click="energyLevel = i"
            class="w-7 h-7 rounded-full text-xs transition-all duration-150"
            :class="energyLevel === i ? 'bg-accent text-white scale-110' : 'bg-elevated text-muted'"
          >
            {{ ['😞', '😐', '🙂', '😊', '😄'][i - 1] }}
          </button>
        </div>
      </div>

      <!-- 今日任务 -->
      <div v-if="tasks.length > 0" class="space-y-2">
        <div
          v-for="task in tasks"
          :key="task.id"
          @click="toggleTask(task.id)"
          class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
          :class="task.done ? 'bg-success line-through text-muted' : 'bg-elevated text-primary'"
        >
          <div
            class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
            :class="task.done ? 'bg-[var(--success)] border-[var(--success)]' : 'border-subtle'"
          >
            <span v-if="task.done" class="text-white text-xs">✓</span>
          </div>
          <span class="text-sm">{{ task.icon }} {{ task.label }}</span>
          <span class="ml-auto text-xs text-muted">{{ task.duration }}</span>
        </div>
      </div>

      <!-- 无任务时 -->
      <div v-else class="py-6 text-center">
        <p class="text-sm text-muted">暂无今日规划任务</p>
        <p class="text-xs text-muted mt-1">从 Obsidian 同步规划数据后可查看今日任务</p>
      </div>

      <!-- 本周进度 -->
      <div class="mt-4 pt-3 border-t border-subtle">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-muted">本周进度</span>
          <span class="text-xs text-muted">{{ growth.stats.week_completed }}/7</span>
        </div>
        <div class="flex gap-1.5 justify-center">
          <div
            v-for="day in weekDays"
            :key="day.label"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-7 h-7 rounded-lg text-[10px] flex items-center justify-center transition-all"
              :class="day.today ? 'dot-today' : day.done ? 'dot-done' : 'dot-miss'"
            >
              <span v-if="day.done" class="text-white text-[10px]">✓</span>
            </div>
            <span class="text-[9px] text-muted">{{ day.today ? '今' : day.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 每日一问 -->
    <div class="card">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-sm font-medium text-primary">💡 每日一问</span>
        <span class="text-[10px] text-muted">今天工作中有什么想深挖的？</span>
      </div>

      <textarea
        v-model="questionText"
        placeholder="例如：今天发现达梦的limit语法和MySQL不一样，想搞清楚为什么..."
        class="w-full bg-input border border-subtle rounded-xl px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none h-20"
      ></textarea>

      <div class="flex gap-2 mt-2">
        <button
          @click="handleAskAI"
          :disabled="!questionText.trim()"
          class="btn-ghost text-xs flex items-center gap-1"
        >
          🤖 帮我深化
        </button>
        <button
          @click="saveQuestion"
          :disabled="!questionText.trim()"
          class="btn-ghost text-xs flex items-center gap-1 ml-auto"
        >
          💾 保存
        </button>
      </div>

      <!-- AI深化结果 -->
      <div v-if="showDeepened" class="mt-3 p-3 bg-accent rounded-xl border border-accent animate-slide-up">
        <p class="text-xs text-accent font-medium mb-1">🤖 深化方向</p>
        <p class="text-xs text-secondary leading-relaxed">{{ deepenedText }}</p>
      </div>

      <!-- 我的回答 -->
      <div v-if="showDeepened" class="mt-3 animate-slide-up">
        <label class="text-xs text-muted mb-1 block">📝 我的研究结果</label>
        <textarea
          v-model="answerText"
          placeholder="记录你的理解..."
          class="w-full bg-input border border-subtle rounded-xl px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none h-16"
        ></textarea>
      </div>

      <!-- 状态 -->
      <div v-if="questionText" class="flex gap-2 mt-2">
        <button
          v-for="opt in [{ key: 'pondering', label: '🤔 思考中' }, { key: 'answered', label: '✅ 已回答' }, { key: 'published', label: '📝 已发文' }]"
          :key="opt.key"
          @click="questionStatus = opt.key as any"
          class="text-[10px] px-2 py-1 rounded-full transition-all"
          :class="questionStatus === opt.key ? 'bg-accent border-accent text-accent' : 'bg-elevated text-muted border border-transparent'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 打卡按钮 -->
    <button
      v-if="isToday"
      @click="handleCheckIn"
      class="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
      :class="{ 'opacity-50': checkInDone }"
    >
      {{ checkInDone ? '🎉 今日已打卡' : allDone ? '✅ 完成今日打卡' : `📝 打卡（${completedCount}/${tasks.length}）` }}
    </button>
  </div>
</template>
