import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'
import WebSocket from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ===== Wiki 路径（相对于 vault 根目录） =====
export const WIKI_ROOT = path.resolve(
  __dirname, '..', '..', '..',
  '02_Wiki【结构化知识库】',
  '00-个人成长系统'
)

// ===== Supabase =====
export function createSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('❌ 请设置环境变量: VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
    console.error('   可在 growth-app 目录创建 .env.local 或 export 环境变量')
    process.exit(1)
  }
  return createClient(url, anonKey, {
    realtime: { transport: WebSocket as any },
  })
}

// ===== 同步账号 =====
export function getSyncCredentials() {
  return {
    email: process.env.VITE_SYNC_EMAIL || '',
    password: process.env.VITE_SYNC_PASSWORD || '',
  }
}

// 当前年份/季度/周
export const CURRENT_YEAR = 2026
export const CURRENT_QUARTER = 'Q3'
export const CURRENT_WEEK = 'W28'
