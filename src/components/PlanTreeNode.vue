<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlanNode } from '@/types'

const props = defineProps<{
  node: PlanNode
  depth: number
  allPlans: PlanNode[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const open = ref(props.depth < 2) // Auto-expand first 2 levels

const children = computed(() =>
  props.allPlans
    .filter(p => p.parent_id === props.node.id)
    .sort((a, b) => a.sort_order - b.sort_order)
)

const hasChildren = computed(() => children.value.length > 0)
const isCurrent = computed(() => props.node.is_current)

const levelIcons: Record<string, string> = {
  vision: '🎯', annual: '📅', quarterly: '🎯', monthly: '📋', weekly: '📋', daily: '✅'
}

const statusColors: Record<string, string> = {
  in_progress: 'border-l-grow-500',
  completed: 'border-l-emerald-500',
  paused: 'border-l-slate-500',
  abandoned: 'border-l-red-500',
  not_started: 'border-l-slate-600',
}

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="animate-fade-in">
    <div
      class="flex items-center gap-2 py-2 pr-3 rounded-xl mb-0.5 cursor-pointer transition-all duration-150 border-l-2"
      :class="[
        statusColors[node.status] || 'border-l-slate-600',
        isCurrent ? 'bg-grow-500/10 ring-1 ring-grow-500/30' : 'hover:bg-white/5'
      ]"
      :style="{ paddingLeft: `${12 + depth * 16}px` }"
      @click="toggle"
    >
      <span class="text-xs text-slate-500 w-4 text-center shrink-0">
        {{ hasChildren ? (open ? '▼' : '▶') : '·' }}
      </span>
      <span class="text-sm shrink-0">{{ levelIcons[node.level] || '📌' }}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-sm truncate" :class="isCurrent ? 'text-grow-300 font-medium' : 'text-slate-200'">
            {{ node.title }}
          </span>
          <span v-if="isCurrent" class="text-[10px] text-grow-400 bg-grow-500/15 px-1.5 py-0.5 rounded">当前</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-16 h-1.5 bg-deep-600 rounded-full overflow-hidden hidden sm:block">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="node.progress >= 80 ? 'bg-emerald-500' : node.progress >= 40 ? 'bg-grow-500' : 'bg-slate-500'"
            :style="{ width: node.progress + '%' }"
          />
        </div>
        <span class="text-xs text-slate-400 w-8 text-right">{{ node.progress }}%</span>
      </div>
    </div>

    <template v-if="hasChildren && open">
      <PlanTreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :all-plans="allPlans"
      />
    </template>
  </div>
</template>
