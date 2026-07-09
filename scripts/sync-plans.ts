/**
 * sync-plans.ts — 从 Obsidian Wiki 同步规划数据到 Supabase
 *
 * 用法:
 *   cd 04_AI_Apps/growth-app
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
 *   VITE_SYNC_EMAIL=... VITE_SYNC_PASSWORD=... \
 *   npx tsx scripts/sync-plans.ts
 *
 * 或在 growth-app/.env.local 中设置以上环境变量
 */
import fs from 'fs'
import path from 'path'
import { WIKI_ROOT, createSupabaseClient, getSyncCredentials, CURRENT_YEAR, CURRENT_QUARTER, CURRENT_WEEK } from './sync-plans.config'
import type { PlanNode, PlanLevel, PlanArea, PlanStatus, DailyTask, PlanMeta } from '../src/types'

// ===== 工具 =====
function readFile(filename: string): string {
  const fp = path.join(WIKI_ROOT, filename)
  try {
    return fs.readFileSync(fp, 'utf-8')
  } catch {
    console.warn(`  ⚠️ 文件不存在: ${filename}`)
    return ''
  }
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseTasksFromChecklist(text: string): DailyTask[] {
  const tasks: DailyTask[] = []
  const regex = /-\s+\[.?\]\s*(.+?)(?:\s+\((\d+)′?\))?$/gm
  let match
  while ((match = regex.exec(text)) !== null) {
    tasks.push({ label: match[1].trim(), duration: match[2] ? `${match[2]}′` : '' })
  }
  return tasks
}

function parseTasksWithIcons(text: string): DailyTask[] {
  const tasks: DailyTask[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('- [') && !trimmed.startsWith('* [')) continue
    const match = trimmed.match(/-\s*\[.?\]\s*(.+)/)
    if (!match) continue
    const content = match[1].trim()
    // Extract emoji icon if present
    const iconMatch = content.match(/^([\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\u{2700}-\u{27BF}])\s*/u)
    const icon = iconMatch ? iconMatch[1] : '📋'
    const label = iconMatch ? content.slice(iconMatch[0].length).trim() : content
    // Extract duration
    const durMatch = label.match(/\((\d+)分钟?\)\s*$/)
    const duration = durMatch ? `${durMatch[1]}′` : ''
    const cleanLabel = durMatch ? label.slice(0, -durMatch[0].length).trim() : label
    tasks.push({ label: cleanLabel, icon, duration })
  }
  return tasks
}

// ===== 解析器 =====

/** 长期规划与愿景 → 4 个 vision 节点 */
function parseVision(uid: string, parentId: string | null): Partial<PlanNode>[] {
  const content = readFile('01-长期规划与愿景.md')
  if (!content) return []

  const areas: { area: PlanArea; title: string; icon: string }[] = [
    { area: 'career', title: '职业发展', icon: '💼' },
    { area: 'finance', title: '财务管理', icon: '💰' },
    { area: 'health', title: '身体健康', icon: '💪' },
    { area: 'family', title: '家庭生活', icon: '🏠' },
  ]

  // Extract vision statement
  const visionMatch = content.match(/>\s*(.+?)(?:\n|$)/)
  const vision = visionMatch ? visionMatch[1] : ''

  // Extract yearly milestones from tables
  const milestones: Record<string, string[]> = { career: [], finance: [], health: [], family: [] }

  // Simple extraction: find table rows with year info per area section
  const sections = content.split(/###\s+/)
  for (const section of sections) {
    const lower = section.toLowerCase()
    for (const area of ['career', 'finance', 'health', 'family'] as PlanArea[]) {
      const areaMap: Record<string, string> = { career: '职业', finance: '财务', health: '健康', family: '家庭' }
      if (!lower.startsWith(areaMap[area])) continue

      // Extract table rows
      const tableLines = section.split('\n').filter(l => l.trim().startsWith('|'))
      for (const line of tableLines) {
        const cells = line.split('|').filter(c => c.trim())
        if (cells.length >= 2) {
          const yearMatch = cells[0].match(/(\d{4})/)
          if (yearMatch) {
            milestones[area].push(`第${yearMatch[1]}年目标: ${cells.slice(1).map(c => c.trim()).join(' | ')}`)
          }
        }
      }
    }
  }

  return areas.map((a, i) => ({
    uid,
    parent_id: parentId,
    level: 'vision' as PlanLevel,
    area: a.area,
    title: a.title,
    description: vision || `3年愿景：${a.title}`,
    progress: 30,
    status: 'in_progress' as PlanStatus,
    start_date: toDateStr(2026, 1, 1),
    end_date: toDateStr(2029, 12, 31),
    sort_order: i,
    is_current: true,
    meta: {
      theme: a.title,
      milestones: milestones[a.area] || [],
    } as PlanMeta,
  }))
}

/** 年度规划 → annual 节点 */
function parseAnnual(uid: string, parentId: string | null): Partial<PlanNode>[] {
  const content = readFile(`02-年度规划/${CURRENT_YEAR}年度.md`)
  if (!content) return []

  const themeMatch = content.match(/>\s*(.+?)(?:\n|$)/)
  const theme = themeMatch ? themeMatch[1] : `${CURRENT_YEAR}年度`

  return [{
    uid,
    parent_id: parentId,
    level: 'annual' as PlanLevel,
    area: 'general' as PlanArea,
    title: `${CURRENT_YEAR}年度 — ${theme}`,
    description: theme,
    progress: 25,
    status: 'in_progress' as PlanStatus,
    start_date: toDateStr(CURRENT_YEAR, 1, 1),
    end_date: toDateStr(CURRENT_YEAR, 12, 31),
    sort_order: 10,
    is_current: true,
    meta: { theme } as PlanMeta,
  }]
}

/** 季度规划 → quarterly 节点（每个 KR 一条） */
function parseQuarterly(uid: string, parentId: string | null): Partial<PlanNode>[] {
  const content = readFile(`03-季度规划/${CURRENT_YEAR}-${CURRENT_QUARTER}.md`)
  if (!content) return []

  const nodes: Partial<PlanNode>[] = []
  const krSections = content.split(/### KR\d+：/)

  for (let i = 1; i < krSections.length; i++) {
    const section = krSections[i]
    const titleLine = section.split('\n')[0].trim()
    const descMatch = section.match(/>\s*(.+?)(?:\n|$)/)

    // Extract metrics table
    const metricsLines: string[] = []
    const tableLines = section.split('\n')
    let inTable = false
    for (const line of tableLines) {
      if (line.trim().startsWith('|')) metricsLines.push(line.trim())
    }

    // Determine area from KR content
    let area: PlanArea = 'career'
    const lower = section.toLowerCase()
    if (lower.includes('健身') || lower.includes('运动') || lower.includes('健康')) area = 'health'
    else if (lower.includes('财务') || lower.includes('存钱')) area = 'finance'
    else if (lower.includes('家庭') || lower.includes('结婚')) area = 'family'

    const krAreaMap: Record<number, PlanArea> = { 1: 'career', 2: 'career', 3: 'family' }
    area = krAreaMap[i] || 'career'

    nodes.push({
      uid,
      parent_id: parentId,
      level: 'quarterly' as PlanLevel,
      area,
      title: `${CURRENT_QUARTER} KR${i}：${titleLine}`,
      description: descMatch ? descMatch[1] : '',
      progress: 10,
      status: 'in_progress' as PlanStatus,
      start_date: toDateStr(CURRENT_YEAR, 7, 1),
      end_date: toDateStr(CURRENT_YEAR, 9, 30),
      sort_order: 20 + i,
      is_current: i === 1,
      meta: {
        kr_id: `kr-${CURRENT_QUARTER}-${i}`,
        kr_metrics: metricsLines.join('\n'),
      } as PlanMeta,
    })
  }

  return nodes
}

/** 周复盘 → weekly 节点 */
function parseWeekly(uid: string, parentId: string | null): Partial<PlanNode>[] {
  const content = readFile(`05-周复盘/${CURRENT_YEAR}-${CURRENT_WEEK}.md`)
  if (!content) return []

  // Extract tasks from the weekly task table
  const tasks: DailyTask[] = []
  const taskTableLines = content.split('\n').filter(l => l.trim().startsWith('|') && l.includes('P'))
  for (const line of taskTableLines) {
    const cells = line.split('|').filter(c => c.trim())
    if (cells.length >= 2) {
      const taskContent = cells[1].trim()
      const durMatch = taskContent.match(/\s*\((\d+)[分钟分]/)
      const duration = durMatch ? `${durMatch[1]}′` : ''
      const label = durMatch ? taskContent.replace(/\(.*?\d+分钟?\).*$/, '').trim() : taskContent
      tasks.push({ label, icon: '📋', duration })
    }
  }

  // Extract daily suggestions
  const dailyBreakdown: Record<string, DailyTask[]> = {}
  const dailyBlock = content.match(/每日建议[\s\S]*?```\n([\s\S]*?)```/)
  if (dailyBlock) {
    const lines = dailyBlock[1].split('\n')
    let currentDay = ''
    for (const line of lines) {
      const dayMatch = line.match(/周[一二三四五六日]\s*（?(\d+)[月/](\d+)）/)
      if (dayMatch) {
        currentDay = `${dayMatch[1].padStart(2, '0')}-${dayMatch[2].padStart(2, '0')}`
        dailyBreakdown[currentDay] = []
      } else if (currentDay && line.trim().startsWith('建议')) {
        const label = line.replace(/^建议\d+[：:]\s*/, '').trim()
        if (label) {
          dailyBreakdown[currentDay].push({ label, icon: '📋' })
        }
      }
    }
  }

  // Calculate week dates
  // W28 in 2026: July 6-12
  const month = 7
  const startDay = { W28: 6, W29: 13, W30: 20, W31: 27 }[CURRENT_WEEK] || 6
  const endDay = startDay + 6

  return [{
    uid,
    parent_id: parentId,
    level: 'weekly' as PlanLevel,
    area: 'general' as PlanArea,
    title: `${CURRENT_WEEK} 复盘（7月${startDay}日-7月${endDay}日）`,
    description: `第${CURRENT_WEEK.slice(1)}周`,
    progress: 0,
    status: 'in_progress' as PlanStatus,
    start_date: toDateStr(CURRENT_YEAR, month, startDay),
    end_date: toDateStr(CURRENT_YEAR, month, endDay),
    sort_order: 30,
    is_current: true,
    meta: {
      tasks,
      daily_breakdown: dailyBreakdown,
    } as PlanMeta,
  }]
}

/** 每日记录 → daily 节点 */
function parseDaily(uid: string, parentId: string | null): Partial<PlanNode>[] {
  const nodes: Partial<PlanNode>[] = []

  // Look for existing daily records
  const dailyDir = path.join(WIKI_ROOT, '06-每日记录')
  if (!fs.existsSync(dailyDir)) return []

  const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.md') && f !== '模板.md')
  for (const file of files.slice(0, 7)) {
    // Parse date from filename: YYYY-MM-DD.md
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/)
    if (!dateMatch) continue
    const date = dateMatch[1]

    const content = fs.readFileSync(path.join(dailyDir, file), 'utf-8')
    const tasks = parseTasksWithIcons(content)

    if (tasks.length === 0) continue

    nodes.push({
      uid,
      parent_id: parentId,
      level: 'daily' as PlanLevel,
      area: 'general' as PlanArea,
      title: `${date} 每日任务`,
      description: '',
      progress: 0,
      status: 'not_started' as PlanStatus,
      start_date: date,
      end_date: date,
      sort_order: 40,
      is_current: false,
      meta: { tasks } as PlanMeta,
    })
  }

  return nodes
}

// ===== 同步主函数 =====
async function sync() {
  console.log('🚀 开始同步规划数据...\n')

  // 1. Initialize Supabase
  const supabase = createSupabaseClient()
  const creds = getSyncCredentials()

  if (!creds.email || !creds.password) {
    console.error('❌ 请设置 VITE_SYNC_EMAIL 和 VITE_SYNC_PASSWORD 环境变量')
    console.error('   这是你登录 growth-app 的 Supabase 账号')
    process.exit(1)
  }

  // 2. Authenticate
  console.log('🔑 登录中...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  })

  if (authError || !authData.user) {
    console.error('❌ 登录失败:', authError?.message)
    process.exit(1)
  }

  const uid = authData.user.id
  console.log(`✅ 已登录: ${authData.user.email} (${uid.slice(0, 8)}...)\n`)

  // 3. Build plan hierarchy
  const allNodes: Partial<PlanNode>[] = []

  // Collect unique nodes from each parser (no nested duplication)
  const visions = parseVision(uid, null)
  allNodes.push(...visions)

  const annuals = parseAnnual(uid, null)
  allNodes.push(...annuals)

  const quarters = parseQuarterly(uid, null)
  allNodes.push(...quarters)

  const weeklies = parseWeekly(uid, null)
  allNodes.push(...weeklies)

  const dailies = parseDaily(uid, null)
  allNodes.push(...dailies)

  console.log(`📋 共解析 ${allNodes.length} 个规划节点\n`)

  // 4. Delete old data then insert fresh
  console.log('🗑️ 清除旧数据...')
  await supabase.from('growth_plans').delete().eq('uid', uid)

  let inserted = 0
  for (const node of allNodes) {
    const { error } = await supabase
      .from('growth_plans')
      .insert({
        uid,
        level: node.level,
        area: node.area,
        title: node.title,
        description: node.description || null,
        progress: node.progress || 0,
        status: node.status || 'not_started',
        start_date: node.start_date || null,
        end_date: node.end_date || null,
        sort_order: node.sort_order || 0,
        is_current: node.is_current || false,
        meta: node.meta || {},
        parent_id: node.parent_id || null,
      })

    if (error) {
      console.error(`  ❌ 插入失败: ${node.title}`, error.message)
    } else {
      inserted++
      console.log(`  ✅ ${node.level?.padEnd(10)} ${node.title}`)
    }
  }

  console.log(`\n✨ 完成! 成功同步 ${inserted}/${allNodes.length} 个节点`)
}

sync().catch(err => {
  console.error('💥 同步异常:', err)
  process.exit(1)
})
