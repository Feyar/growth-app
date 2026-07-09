<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import { useRouter } from 'vue-router'
import { supabaseEnabled } from '@/utils/supabase'
import { fetchLatestPlanUpdate } from '@/utils/growth-api'

const auth = useAuthStore()
const growth = useGrowthStore()
const router = useRouter()

const checking = ref(false)
const checkResult = ref('')
const cacheCleared = ref(false)
const lastSyncTime = ref('')
const refreshing = ref(false)

onMounted(async () => {
  if (auth.isLoggedIn()) {
    await loadSyncTime()
  }
})

async function loadSyncTime() {
  const ts = await fetchLatestPlanUpdate()
  lastSyncTime.value = ts
    ? new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '暂无数据'
}

async function handleRefresh() {
  refreshing.value = true
  await growth.loadAll()
  await loadSyncTime()
  refreshing.value = false
}

async function handleLogout() {
  await auth.signOut()
  router.replace('/login')
}

async function handlePwaUpdate() {
  checking.value = true
  checkResult.value = ''
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) await reg.unregister()
    }
    cacheCleared.value = true
    checkResult.value = '缓存已清除，刷新页面后生效'
  } catch (e) {
    checkResult.value = '操作失败，请手动刷新'
  }
  checking.value = false
}

function refreshApp() {
  window.location.reload()
}
</script>

<template>
  <div class="px-4 pt-2 pb-6 space-y-3 animate-fade-in">
    <!-- ☁️ 数据同步 -->
    <div class="card">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-medium text-primary">☁️ 数据同步</h2>
        <span
          v-if="!supabaseEnabled"
          class="text-[10px] px-2 py-0.5 rounded-full bg-elevated text-muted"
        >未配置</span>
        <span
          v-else-if="!auth.isLoggedIn()"
          class="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent"
        >未登录</span>
        <span
          v-else
          class="text-[10px] px-2 py-0.5 rounded-full bg-success text-success"
        >已连接</span>
      </div>

      <template v-if="!supabaseEnabled">
        <p class="text-xs text-muted leading-relaxed">
          同步功能需要配置 Supabase 环境变量才能使用
        </p>
      </template>

      <template v-else-if="!auth.isLoggedIn()">
        <p class="text-xs text-muted mb-3">登录后可查看规划数据与打卡记录</p>
        <button @click="router.push('/login')" class="btn-primary w-full text-sm">
          登录 / 注册
        </button>
      </template>

      <template v-else>
        <p class="text-xs text-muted mb-1">当前账号</p>
        <p class="text-sm font-medium text-primary mb-1">{{ auth.user?.email }}</p>
        <p class="text-xs text-muted mb-3">规划版本：{{ lastSyncTime }}</p>
        <button
          @click="handleRefresh"
          :disabled="refreshing"
          class="btn-ghost w-full text-sm"
        >
          {{ refreshing ? '刷新中...' : '🔄 刷新数据' }}
        </button>
        <button @click="handleLogout" class="w-full mt-2 py-1.5 text-xs text-muted hover:text-danger transition-colors">
          退出登录
        </button>
      </template>
    </div>

    <!-- 👤 账号（未登录时的简短提示） -->
    <div v-if="auth.isLoggedIn()" class="card">
      <div class="text-sm font-medium text-primary mb-2">📦 数据维护</div>
      <p class="text-xs text-muted mb-3">清除本地缓存并刷新到最新版本</p>
      <button
        @click="handlePwaUpdate"
        :disabled="checking"
        class="btn-ghost text-xs"
      >
        {{ checking ? '清理中...' : '🗑️ 清除缓存并更新' }}
      </button>
      <p v-if="checkResult" class="text-xs text-success mt-2">{{ checkResult }}</p>
      <button v-if="cacheCleared" @click="refreshApp" class="btn-primary text-xs mt-2">
        刷新应用
      </button>
    </div>

    <!-- 🧭 关于 -->
    <div class="card">
      <div class="text-sm font-medium text-primary mb-2">🧭 关于</div>
      <p class="text-xs text-muted">人生系统 v0.2.0</p>
      <p class="text-xs text-muted mt-1">把你的长期规划，变成每日可执行的一件事</p>
    </div>
  </div>
</template>
