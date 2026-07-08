<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import { useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'

const auth = useAuthStore()
const growth = useGrowthStore()
const router = useRouter()

const isRootPage = computed(() => router.currentRoute.value.path === '/')

onMounted(async () => {
  await auth.init()
  if (auth.isLoggedIn()) {
    await growth.loadAll()
  }
})
</script>

<template>
  <div class="min-h-screen bg-deep-900 pb-20">
    <header v-if="isRootPage" class="px-4 pt-6 pb-2">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-slate-100">
            {{ auth.isLoggedIn() ? '☀️ 早上好' : '🧭 成长系统' }}
          </h1>
          <p v-if="auth.isLoggedIn()" class="text-xs text-slate-400 mt-0.5">
            {{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}
          </p>
        </div>
        <router-link
          to="/settings"
          class="w-9 h-9 rounded-full bg-deep-700 flex items-center justify-center text-sm border border-white/5"
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
