<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import PlanTreeNode from '@/components/PlanTreeNode.vue'

const auth = useAuthStore()
const growth = useGrowthStore()

const activeFilter = ref<string>('all')

const filters = [
  { key: 'all', label: '📌 全部' },
  { key: 'career', label: '💼 职业' },
  { key: 'finance', label: '💰 财务' },
  { key: 'health', label: '💪 健康' },
  { key: 'family', label: '🏠 家庭' },
]

const rootNodes = () => {
  const all = growth.plans.filter(p => p.parent_id === null)
  if (activeFilter.value === 'all') return all
  return all.filter(p => p.area === activeFilter.value)
}
</script>

<template>
  <div v-if="!auth.isLoggedIn()" class="flex flex-col items-center justify-center min-h-[60vh] px-6">
    <p class="text-slate-400 text-sm">请先登录</p>
    <router-link to="/login" class="btn-ghost mt-3">登录</router-link>
  </div>

  <div v-else class="px-4 pt-2 pb-6 animate-fade-in">
    <!-- 筛选 -->
    <div class="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="activeFilter = f.key"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full transition-all duration-150"
        :class="activeFilter === f.key ? 'bg-grow-500/20 text-grow-400 border border-grow-500/30' : 'bg-deep-700 text-slate-400 border border-white/5'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- 树 -->
    <div class="space-y-0.5">
      <PlanTreeNode
        v-for="root in rootNodes()"
        :key="root.id"
        :node="root"
        :depth="0"
        :all-plans="growth.plans"
      />
    </div>

    <div v-if="rootNodes().length === 0" class="text-center py-12">
      <p class="text-slate-500 text-sm">暂无规划数据</p>
    </div>
  </div>
</template>
