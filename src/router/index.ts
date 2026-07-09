import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'dashboard', component: () => import('@/views/GrowthDashboard.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  { path: '/plan-tree', name: 'plan-tree', component: () => import('@/views/PlanTreeView.vue') },
  { path: '/checkin', name: 'checkin', component: () => import('@/views/DailyCheckIn.vue') },
  { path: '/checkin/:date', name: 'checkin-date', component: () => import('@/views/DailyCheckIn.vue') },
  { path: '/history', name: 'history', redirect: '/history/calendar' },
  { path: '/history/calendar', name: 'history-calendar', component: () => import('@/views/HistoryView.vue') },
  { path: '/history/trend', name: 'history-trend', component: () => import('@/views/HistoryView.vue') },
  { path: '/history/pipeline', name: 'history-pipeline', component: () => import('@/views/HistoryView.vue') },
  { path: '/history/insights', name: 'history-insights', component: () => import('@/views/HistoryView.vue') },
  { path: '/history/search', name: 'history-search', component: () => import('@/views/HistoryView.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
