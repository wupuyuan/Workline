import type { Database } from 'sql.js'
import type {
  AssignmentRole,
  BookmarkType,
  ProjectStatus,
  TaskStage,
  TaskStatus
} from '@shared/types'
import { lastInsertId, queryOne, run } from './db'

interface SeedUser {
  name: string
  role: string
  employeeNo: string
}
interface SeedProject {
  name: string
  status: ProjectStatus
  ownerName: string | null
  startDate: string
  endDate: string
  progress: number
  description: string
}
interface SeedTask {
  project: string
  name: string
  stage: TaskStage
  status: TaskStatus
  ownerName: string | null
  statusUserName: string | null
  startDate: string
  endDate: string
  progress: number
  members?: string[]
}
interface SeedDep {
  project: string
  task: string
  dependsOn: string
}
interface SeedBookmark {
  project: string
  task: string
  type: BookmarkType
  title: string
  description: string
  date: string
}

const USERS: SeedUser[] = [
  { name: '张三', role: '产品经理', employeeNo: 'E1001' },
  { name: '李四', role: '后端开发', employeeNo: 'E1002' },
  { name: '王五', role: '全栈开发', employeeNo: 'E1003' },
  { name: '赵六', role: '前端开发', employeeNo: 'E1004' }
]

const PROJECTS: SeedProject[] = [
  {
    name: '智慧园区管理平台',
    status: 'RUNNING',
    ownerName: '张三',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    progress: 45,
    description: '面向产业园区的综合管理平台'
  },
  {
    name: '智能硬件研发项目',
    status: 'SUSPENDED',
    ownerName: '王五',
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    progress: 20,
    description: '智能硬件产品研发'
  },
  {
    name: '数据分析平台',
    status: 'DONE',
    ownerName: '张三',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    progress: 100,
    description: '企业级数据分析平台'
  }
]

const TASKS: SeedTask[] = [
  // 智慧园区管理平台
  {
    project: '智慧园区管理平台',
    name: '需求评审会议',
    stage: 'REQUIREMENT',
    status: 'DEVELOPMENT',
    ownerName: '张三',
    statusUserName: '张三',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    progress: 40,
    members: ['李四']
  },
  {
    project: '智慧园区管理平台',
    name: '竞品分析报告',
    stage: 'REQUIREMENT',
    status: 'DONE',
    ownerName: '王五',
    statusUserName: '王五',
    startDate: '2026-08-01',
    endDate: '2026-08-20',
    progress: 100
  },
  {
    project: '智慧园区管理平台',
    name: '用户访谈',
    stage: 'REQUIREMENT',
    status: 'REVIEW',
    ownerName: '张三',
    statusUserName: '张三',
    startDate: '2026-08-10',
    endDate: '2026-09-15',
    progress: 0,
    members: ['赵六']
  },
  {
    project: '智慧园区管理平台',
    name: '数据库设计',
    stage: 'DEVELOPMENT',
    status: 'REVIEW',
    ownerName: '李四',
    statusUserName: '李四',
    startDate: '2026-09-01',
    endDate: '2026-09-20',
    progress: 0
  },
  {
    project: '智慧园区管理平台',
    name: '后端API开发',
    stage: 'DEVELOPMENT',
    status: 'DEVELOPMENT',
    ownerName: '王五',
    statusUserName: '王五',
    startDate: '2026-09-05',
    endDate: '2026-10-20',
    progress: 60,
    members: ['张三']
  },
  {
    project: '智慧园区管理平台',
    name: '前端页面开发',
    stage: 'DEVELOPMENT',
    status: 'DEVELOPMENT',
    ownerName: '赵六',
    statusUserName: '赵六',
    startDate: '2026-09-05',
    endDate: '2026-10-20',
    progress: 40
  },
  {
    project: '智慧园区管理平台',
    name: '集成测试',
    stage: 'TESTING',
    status: 'REVIEW',
    ownerName: '李四',
    statusUserName: '李四',
    startDate: '2026-10-25',
    endDate: '2026-11-15',
    progress: 0
  },
  // 智能硬件研发项目
  {
    project: '智能硬件研发项目',
    name: '硬件规格确认',
    stage: 'REQUIREMENT',
    status: 'DONE',
    ownerName: '王五',
    statusUserName: '王五',
    startDate: '2026-08-01',
    endDate: '2026-08-18',
    progress: 100
  },
  {
    project: '智能硬件研发项目',
    name: 'PCB设计',
    stage: 'DEVELOPMENT',
    status: 'DEVELOPMENT',
    ownerName: '张三',
    statusUserName: '张三',
    startDate: '2026-08-20',
    endDate: '2026-10-15',
    progress: 10
  },
  {
    project: '智能硬件研发项目',
    name: '固件开发',
    stage: 'DEVELOPMENT',
    status: 'REVIEW',
    ownerName: '李四',
    statusUserName: '李四',
    startDate: '2026-10-01',
    endDate: '2026-11-20',
    progress: 0
  },
  // 数据分析平台
  {
    project: '数据分析平台',
    name: '数据模型设计',
    stage: 'DEVELOPMENT',
    status: 'DONE',
    ownerName: '张三',
    statusUserName: '张三',
    startDate: '2026-06-15',
    endDate: '2026-07-10',
    progress: 100
  }
]

const DEPS: SeedDep[] = [
  { project: '智慧园区管理平台', task: '后端API开发', dependsOn: '数据库设计' },
  { project: '智慧园区管理平台', task: '前端页面开发', dependsOn: '数据库设计' },
  { project: '智慧园区管理平台', task: '集成测试', dependsOn: '后端API开发' },
  { project: '智能硬件研发项目', task: 'PCB设计', dependsOn: '硬件规格确认' },
  { project: '智能硬件研发项目', task: '固件开发', dependsOn: 'PCB设计' }
]

const BOOKMARKS: SeedBookmark[] = [
  {
    project: '智慧园区管理平台',
    task: '用户访谈',
    type: 'MILESTONE',
    title: '里程碑：完成首批用户访谈 (10人)',
    description: '已访谈10位目标用户，初步需求画像完成',
    date: '2026-08-20'
  },
  {
    project: '智慧园区管理平台',
    task: '用户访谈',
    type: 'DECISION',
    title: '决策：增加老年用户群体',
    description: '因产品目标用户包含银发族，需额外招募5位老年用户',
    date: '2026-08-25'
  },
  {
    project: '智慧园区管理平台',
    task: '用户访谈',
    type: 'REQUIREMENT_CHANGE',
    title: '需求变更：访谈提纲增加适老化问题模块',
    description: '根据8/25决策，补充适老化相关问题',
    date: '2026-09-02'
  },
  {
    project: '智慧园区管理平台',
    task: '用户访谈',
    type: 'ISSUE',
    title: '风险：老年用户招募困难',
    description: '已协调社区渠道，预计9/10前完成',
    date: '2026-09-05'
  },
  {
    project: '智慧园区管理平台',
    task: '需求评审会议',
    type: 'NOTE',
    title: '备注：评审范围确认',
    description: '首次评审范围覆盖一期核心功能',
    date: '2026-08-03'
  },
  {
    project: '智慧园区管理平台',
    task: '竞品分析报告',
    type: 'ISSUE',
    title: '风险：竞品数据来源有限',
    description: '公开渠道数据不足，需补充行业报告',
    date: '2026-08-10'
  }
]

export function seedIfEmpty(d: Database): void {
  const row = queryOne<{ c: number }>(d, 'SELECT COUNT(*) AS c FROM users')
  if ((row?.c ?? 0) === 0) {
    resetAndSeed(d)
  }
}

export function resetAndSeed(d: Database): void {
  const tables = ['bookmarks', 'dependencies', 'assignments', 'tasks', 'projects', 'users']
  for (const t of tables) run(d, `DELETE FROM ${t}`)

  const userByName = new Map<string, number>()
  for (const u of USERS) {
    run(d, 'INSERT INTO users (name, role, employeeNo) VALUES (?, ?, ?)', [u.name, u.role, u.employeeNo])
    userByName.set(u.name, lastInsertId(d))
  }

  const projectByName = new Map<string, number>()
  for (const p of PROJECTS) {
    const ownerId = p.ownerName ? userByName.get(p.ownerName) ?? null : null
    run(
      d,
      `INSERT INTO projects (name, status, statusOwnerId, ownerId, startDate, endDate, progress, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.status, ownerId, ownerId, p.startDate, p.endDate, p.progress, p.description]
    )
    projectByName.set(p.name, lastInsertId(d))
  }

  const taskKey = new Map<string, number>()
  for (const t of TASKS) {
    const projectId = projectByName.get(t.project)
    if (!projectId) continue
    const ownerId = t.ownerName ? userByName.get(t.ownerName) ?? null : null
    const statusUserId = t.statusUserName ? userByName.get(t.statusUserName) ?? null : null
    run(
      d,
      `INSERT INTO tasks (projectId, name, stage, status, statusUserId, ownerId, startDate, endDate, progress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, t.name, t.stage, t.status, statusUserId, ownerId, t.startDate, t.endDate, t.progress]
    )
    const tid = lastInsertId(d)
    taskKey.set(`${t.project}::${t.name}`, tid)

    for (const m of t.members ?? []) {
      const mid = userByName.get(m)
      if (mid) run(d, 'INSERT OR IGNORE INTO assignments (taskId, userId, role) VALUES (?, ?, ?)', [tid, mid, 'MEMBER' as AssignmentRole])
    }
  }

  for (const dep of DEPS) {
    const a = taskKey.get(`${dep.project}::${dep.task}`)
    const b = taskKey.get(`${dep.project}::${dep.dependsOn}`)
    if (a && b) run(d, 'INSERT OR IGNORE INTO dependencies (taskId, dependsOnTaskId) VALUES (?, ?)', [a, b])
  }

  for (const b of BOOKMARKS) {
    const tid = taskKey.get(`${b.project}::${b.task}`)
    if (tid) run(d, 'INSERT INTO bookmarks (taskId, type, title, description, date) VALUES (?, ?, ?, ?, ?)', [tid, b.type, b.title, b.description, b.date])
  }
}
