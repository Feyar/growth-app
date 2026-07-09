<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const growth = useGrowthStore()
const router = useRouter()

onMounted(async () => {
  if (!auth.isLoggedIn()) return
  await growth.loadAll()
})

const statCards = computed(() => [
  { value: `${growth.stats.current_streak}`, label: '连续天数', icon: '🔥', color: 'text-accent' },
  { value: `${growth.stats.week_completed}/7`, label: '本周完成', icon: '📅', color: 'text-success' },
  { value: `${growth.stats.month_completed}`, label: '本月累计', icon: '💪', color: 'text-accent' },
])

const weekDays = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const checkIn = growth.checkIns.find(c => c.check_in_date === key)
    days.push({ date: key, label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], done: checkIn ? checkIn.completed_count > 0 : false, today: i === 0 })
  }
  return days
})

const levelIcons: Record<string, string> = {
  vision: '🎯', annual: '📅', quarterly: '🎯', monthly: '📋', weekly: '📋', daily: '✅'
}
</script>

<template>
  <div v-if="!auth.isLoggedIn()" class="flex flex-col items-center justify-center min-h-screen px-6 -mt-20">
    <div class="text-6xl mb-6">🧭</div>
    <h2 class="text-xl font-bold text-primary mb-2">你的个人成长系统</h2>
    <p class="text-sm text-muted text-center mb-8">登录后查看规划、打卡和进度</p>
    <router-link to="/login" class="btn-primary">登录</router-link>
  </div>

  <div v-else-if="growth.loading" class="flex items-center justify-center min-h-[60vh]">
    <div class="text-muted animate-pulse">加载中...</div>
  </div>

  <div v-else class="px-4 pt-2 pb-6 space-y-4 animate-fade-in">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-3">
      <div v-for="s in statCards" :key="s.label" class="stat-card">
        <div class="text-xl mb-1">{{ s.icon }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label" :class="s.color">{{ s.label }}</div>
      </div>
    </div>

    <!-- 本周进度条 -->
    <div class="card">
      <div class="flex justify-between items-center mb-3">
        <span class="text-sm font-medium text-primary">本周进度</span>
        <span class="text-xs text-muted">{{ growth.stats.week_completed }}/7 天</span>
      </div>
      <div class="flex gap-2 justify-center">
        <div
          v-for="day in weekDays"
          :key="day.date"
          :class="day.today ? 'dot-today' : day.done ? 'dot-done' : 'dot-miss'"
        >
          <span v-if="day.done || day.today" class="text-white/80 text-[10px]">{{ day.done ? '✓' : '' }}</span>
        </div>
      </div>
      <div class="flex justify-between mt-1.5 px-1">
        <span v-for="day in weekDays" :key="day.date + '-label'" class="text-[10px] text-muted w-8 text-center">
          {{ day.today ? '今天' : day.label }}
        </span>
      </div>
    </div>

    <!-- 当前路径（你在这里） -->
    <div class="card-highlight">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs font-medium text-accent">📍 你在这里</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="node in growth.currentPlanPath" :key="node.id" class="flex items-center gap-2">
          <span class="text-sm">{{ levelIcons[node.level] || '📌' }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span class="text-xs text-primary truncate">{{ node.title }}</span>
              <span class="text-[10px] text-muted ml-2">{{ node.progress }}%</span>
            </div>
            <div class="progress-bar mt-1">
              <div class="progress-fill" :style="{ width: node.progress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日任务 -->
    <div v-if="growth.todayCheckIn" class="card">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-primary">今日任务</span>
        <span class="text-xs text-success">{{ growth.todayCheckIn.completed_count }}/{{ growth.todayCheckIn.total_count }} 完成</span>
      </div>
      <div class="flex items-center justify-center py-4">
        <div class="text-center">
          <div class="text-3xl mb-2">{{ growth.todayCheckIn.completed_count >= growth.todayCheckIn.total_count ? '🎉' : '📝' }}</div>
          <p class="text-sm text-secondary">
            {{ growth.todayCheckIn.completed_count >= growth.todayCheckIn.total_count ? '今日已完成' : '还有任务待完成' }}
          </p>
          <button @click="router.push('/checkin')" class="btn-ghost mt-3 text-xs">
            {{ growth.todayCheckIn.completed_count >= growth.todayCheckIn.total_count ? '查看详情' : '去打卡 →' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 每日一问 -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-primary">💡 每日一问</span>
        <router-link to="/checkin" class="text-xs text-accent">去提问 →</router-link>
      </div>
      <p class="text-xs text-muted">今天工作中有什么想深挖的技术点？</p>
    </div>

    <!-- 快捷入口 -->
    <div class="grid grid-cols-4 gap-2">
      <router-link to="/history/calendar" class="card text-center py-3 space-y-1 !p-3">
        <span class="text-xl block">📅</span>
        <span class="text-[10px] text-muted">日历</span>
      </router-link>
      <router-link to="/history/trend" class="card text-center py-3 space-y-1 !p-3">
        <span class="text-xl block">📈</span>
        <span class="text-[10px] text-muted">趋势</span>
      </router-link>
      <router-link to="/history/pipeline" class="card text-center py-3 space-y-1 !p-3">
        <span class="text-xl block">🔄</span>
        <span class="text-[10px] text-muted">知识</span>
      </router-link>
      <router-link to="/history/search" class="card text-center py-3 space-y-1 !p-3">
        <span class="text-xl block">🔍</span>
        <span class="text-[10px] text-muted">搜索</span>
      </router-link>
    </div>
  </div>
</template>
