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

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="animate-fade-in">
    <div
      class="flex items-center gap-2 py-2 pr-3 rounded-xl mb-0.5 cursor-pointer transition-all duration-150"
      :style="{
        paddingLeft: `${12 + depth * 16}px`,
        backgroundColor: isCurrent ? 'var(--accent-bg)' : undefined,
        borderLeft: `3px solid ${
          node.status === 'in_progress' ? 'var(--accent)' :
          node.status === 'completed' ? 'var(--success)' :
          node.status === 'paused' ? 'var(--text-muted)' :
          node.status === 'abandoned' ? 'var(--danger)' :
          'var(--text-dim)'
        }`,
      }"
      @click="toggle"
    >
      <span class="text-xs" style="color: var(--text-dim); width: 1rem; text-align: center; flex-shrink: 0;">
        {{ hasChildren ? (open ? '▼' : '▶') : '·' }}
      </span>
      <span class="text-sm shrink-0">{{ levelIcons[node.level] || '📌' }}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-sm truncate" :style="{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }">
            {{ node.title }}
          </span>
          <span v-if="isCurrent" class="text-[10px] px-1.5 py-0.5 rounded" :style="{ color: 'var(--accent)', backgroundColor: 'var(--accent-bg)' }">当前</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-16 h-1.5 rounded-full overflow-hidden hidden sm:block" :style="{ backgroundColor: 'var(--bg-elevated)' }">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{
              width: node.progress + '%',
              backgroundColor: node.progress >= 80 ? 'var(--success)' : node.progress >= 40 ? 'var(--accent)' : 'var(--text-muted)'
            }"
          />
        </div>
        <span class="text-xs text-muted w-8 text-right">{{ node.progress }}%</span>
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
