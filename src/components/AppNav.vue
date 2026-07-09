<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const tabs = [
  { path: '/', icon: '📊', label: '总览', key: 'dashboard' },
  { path: '/plan-tree', icon: '🌳', label: '规划', key: 'plan-tree' },
  { path: '/checkin', icon: '✅', label: '打卡', key: 'checkin' },
  { path: '/history', icon: '📖', label: '追溯', key: 'history' },
]

const activeTab = computed(() => {
  const r = route.path
  if (r === '/') return 'dashboard'
  if (r.startsWith('/plan-tree')) return 'plan-tree'
  if (r.startsWith('/checkin')) return 'checkin'
  if (r.startsWith('/history')) return 'history'
  return ''
})
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-pb"
    :style="{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }"
  >
    <div class="max-w-lg mx-auto flex justify-around py-2 px-2">
      <router-link
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path"
        class="flex flex-col items-center py-1 px-4 rounded-xl transition-all duration-150"
        :class="activeTab === tab.key ? 'scale-105' : ''"
        :style="{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)' }"
      >
        <span class="text-xl leading-none mb-0.5">{{ tab.icon }}</span>
        <span class="text-[10px] font-medium">{{ tab.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
