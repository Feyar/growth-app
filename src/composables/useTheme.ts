import { ref, onMounted, onUnmounted } from 'vue'
import * as SunCalc from 'suncalc'

// 北京坐标（东八区）
const LAT = 39.9
const LON = 116.4

// 日出后多久切 light（分钟），日落前多久切 dark（分钟）
const DAWN_OFFSET = 30
const DUSK_OFFSET = 30

type Theme = 'light' | 'dark'

const currentTheme = ref<Theme>('dark')
let checkTimer: ReturnType<typeof setInterval> | null = null

function calcTheme(): Theme {
  const now = new Date()
  const times = SunCalc.getTimes(now, LAT, LON)

  // In edge cases (polar night/day), sunrise/sunset can be null — fallback to dark
  if (!times.sunrise || !times.sunset) return 'dark'

  const dawn = new Date(times.sunrise.getTime() - DAWN_OFFSET * 60 * 1000)
  const dusk = new Date(times.sunset.getTime() + DUSK_OFFSET * 60 * 1000)

  return now >= dawn && now <= dusk ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

function updateTheme() {
  applyTheme(calcTheme())
}

export function useTheme() {
  onMounted(() => {
    updateTheme()
    // 每 5 分钟检查一次（覆盖 sunrise/sunset 边界）
    checkTimer = setInterval(updateTheme, 5 * 60 * 1000)
  })

  onUnmounted(() => {
    if (checkTimer) clearInterval(checkTimer)
  })

  return { currentTheme }
}
