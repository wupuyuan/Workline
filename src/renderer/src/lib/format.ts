import type { AssignmentRole, ProjectStatus, Task, TaskStatus } from '@shared/types'
import {
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  TASK_STAGE_LABEL,
  TASK_STAGE_ORDER
} from '@shared/types'

// ---------- 日期 ----------

export function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`)
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function formatDate(s: string): string {
  return s
}

// ---------- 状态显示 ----------

/** 任务在树/甘特中的展示状态：待开始 / 进行中 / 已完成 / 挂起 */
export function taskDisplayState(task: Task, projectSuspended: boolean): '待开始' | '进行中' | '已完成' | '挂起' {
  if (projectSuspended) return '挂起'
  if (task.status === 'DONE') return '已完成'
  if (task.progress <= 0) return '待开始'
  return '进行中'
}

export function displayStateColor(state: string): string {
  switch (state) {
    case '待开始':
      return '#8a8f98'
    case '进行中':
      return '#3b82f6'
    case '已完成':
      return '#30a46c'
    case '挂起':
      return '#f76b15'
    default:
      return '#8a8f98'
  }
}

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  INITIATED: '#8a8f98',
  REQUIREMENT: '#a78bfa',
  RUNNING: '#3b82f6',
  SUSPENDED: '#f76b15',
  DONE: '#30a46c'
}

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  REVIEW: '#a78bfa',
  DEVELOPMENT: '#3b82f6',
  TESTING: '#f59e0b',
  DONE: '#30a46c'
}

export { PROJECT_STATUS_LABEL, TASK_STATUS_LABEL, TASK_STAGE_LABEL, TASK_STAGE_ORDER }

export const ASSIGNMENT_ROLE_LABEL: Record<AssignmentRole, string> = {
  OWNER: '负责人',
  MEMBER: '参与人'
}

/** 人名 → 稳定颜色（按人区分甘特条颜色） */
const PERSON_PALETTE = [
  '#3b82f6',
  '#30a46c',
  '#f59e0b',
  '#e5484d',
  '#a78bfa',
  '#0ea5e9',
  '#ec4899',
  '#84cc16'
]

export function personColor(userId: number): string {
  return PERSON_PALETTE[userId % PERSON_PALETTE.length]
}
