<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import { useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import { useTheme } from '@/composables/useTheme'

const auth = useAuthStore()
const growth = useGrowthStore()
const router = useRouter()

useTheme()

const isRootPage = computed(() => router.currentRoute.value.path === '/')

const greeting = computed(() => {
  if (!auth.isLoggedIn()) return '🧭 人生系统'
  const h = new Date().getHours()
  if (h < 6) return '🌙 夜深了'
  if (h < 12) return '☀️ 早上好'
  if (h < 18) return '🌤️ 下午好'
  return '🌆 晚上好'
})

onMounted(async () => {
  await auth.init()
  if (auth.isLoggedIn()) {
    await growth.loadAll()
  }
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-page); color: var(--text-primary); padding-bottom: 5rem;">
    <header v-if="isRootPage" class="px-4 pt-6 pb-2">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold" style="color: var(--text-primary);">
            {{ greeting }}
          </h1>
          <p v-if="auth.isLoggedIn()" class="text-xs mt-0.5" style="color: var(--text-secondary);">
            {{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}
          </p>
        </div>
        <router-link
          to="/settings"
          class="w-9 h-9 rounded-full flex items-center justify-center text-sm"
          :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }"
        >
          ⚙️
        </router-link>
      </div>
    </header>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <AppNav />
  </div>
</template>
