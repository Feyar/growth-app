<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const checking = ref(false)
const checkResult = ref('')
const cacheCleared = ref(false)

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
  <div class="px-4 pt-2 pb-6 space-y-4 animate-fade-in">
    <div v-if="!auth.isLoggedIn()" class="card text-center py-8">
      <p class="text-sm text-slate-400 mb-3">未登录</p>
      <router-link to="/login" class="btn-primary text-sm">去登录</router-link>
    </div>

    <template v-else>
      <!-- 账号 -->
      <div class="card">
        <div class="text-sm font-medium text-slate-200 mb-2">👤 账号</div>
        <p class="text-xs text-slate-400">{{ auth.user?.email }}</p>
        <button @click="handleLogout" class="btn-ghost text-xs mt-3 text-red-400">退出登录</button>
      </div>

      <!-- 数据维护 -->
      <div class="card">
        <div class="text-sm font-medium text-slate-200 mb-2">📦 数据维护</div>
        <p class="text-xs text-slate-400 mb-3">清除本地缓存并刷新到最新版本</p>
        <button
          @click="handlePwaUpdate"
          :disabled="checking"
          class="btn-ghost text-xs"
        >
          {{ checking ? '清理中...' : '🗑️ 清除缓存并更新' }}
        </button>
        <p v-if="checkResult" class="text-xs text-emerald-400 mt-2">{{ checkResult }}</p>
        <button v-if="cacheCleared" @click="refreshApp" class="btn-primary text-xs mt-2">
          刷新应用
        </button>
      </div>

      <!-- 关于 -->
      <div class="card">
        <div class="text-sm font-medium text-slate-200 mb-2">🧭 关于</div>
        <p class="text-xs text-slate-400">成长系统 v0.1.0</p>
        <p class="text-xs text-slate-500 mt-1">把你的长期规划，变成每日可执行的一件事</p>
      </div>
    </template>
  </div>
</template>
