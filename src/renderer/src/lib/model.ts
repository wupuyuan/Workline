import type {
  Assignment,
  Bookmark,
  FullData,
  Project,
  Task,
  TaskStage,
  User
} from '@shared/types'
import { TASK_STAGE_ORDER } from '@shared/types'

// ---------- 查找辅助 ----------

export function userById(data: FullData, id: number | null | undefined): User | undefined {
  if (id == null) return undefined
  return data.users.find((u) => u.id === id)
}

export function projectById(data: FullData, id: number | null | undefined): Project | undefined {
  if (id == null) return undefined
  return data.projects.find((p) => p.id === id)
}

export function taskById(data: FullData, id: number | null | undefined): Task | undefined {
  if (id == null) return undefined
  return data.tasks.find((t) => t.id === id)
}

// ---------- 资源分配 ----------

export function assignmentsForTask(data: FullData, taskId: number): Assignment[] {
  return data.assignments.filter((a) => a.taskId === taskId)
}

/** 负责人（唯一，来自 task.ownerId） */
export function taskOwner(data: FullData, taskId: number): User | undefined {
  const t = taskById(data, taskId)
  return userById(data, t?.ownerId)
}

/** 参与人（多个，来自 assignments） */
export function participantsForTask(data: FullData, taskId: number): User[] {
  return assignmentsForTask(data, taskId)
    .map((a) => userById(data, a.userId))
    .filter((u): u is User => Boolean(u))
}

/** 任务上的所有人：负责人 + 参与人（负责人 role=OWNER，参与人 role=MEMBER） */
export function usersForTask(data: FullData, taskId: number): { user: User; role: 'OWNER' | 'MEMBER' }[] {
  const result: { user: User; role: 'OWNER' | 'MEMBER' }[] = []
  const owner = taskOwner(data, taskId)
  if (owner) result.push({ user: owner, role: 'OWNER' })
  for (const u of participantsForTask(data, taskId)) {
    if (u.id !== owner?.id) result.push({ user: u, role: 'MEMBER' })
  }
  return result
}

// ---------- 项目 / 任务 ----------

export function tasksOfProject(data: FullData, projectId: number): Task[] {
  return data.tasks.filter((t) => t.projectId === projectId)
}

/** 按阶段顺序分组：返回 [{ stage, tasks }] */
export function groupedTasks(data: FullData, projectId: number): { stage: TaskStage; tasks: Task[] }[] {
  const all = tasksOfProject(data, projectId)
  return TASK_STAGE_ORDER.map((stage) => ({
    stage,
    tasks: all
      .filter((t) => t.stage === stage)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id)
  })).filter((g) => g.tasks.length > 0)
}

/** 某人的任务（作为负责人或参与人，无角色区分）→ 所属项目分组 */
export function tasksGroupedByProjectForUser(
  data: FullData,
  userId: number
): { project: Project; tasks: Task[] }[] {
  const tasks = data.tasks.filter(
    (t) =>
      t.ownerId === userId ||
      data.assignments.some((a) => a.taskId === t.id && a.userId === userId)
  )
  const map = new Map<number, Task[]>()
  for (const t of tasks) {
    if (!map.has(t.projectId)) map.set(t.projectId, [])
    map.get(t.projectId)!.push(t)
  }
  return [...map.entries()]
    .map(([projectId, ts]) => ({ project: projectById(data, projectId)!, tasks: ts }))
    .filter((g) => Boolean(g.project))
    .sort((a, b) => a.project.name.localeCompare(b.project.name, 'zh'))
}

// ---------- 依赖 ----------

export interface DepEntry {
  depId: number        // dependencies.id（数据库记录ID，用于删除）
  task: Task
}

export function dependenciesOfTask(data: FullData, taskId: number): Task[] {
  const depIds = data.dependencies.filter((d) => d.taskId === taskId).map((d) => d.dependsOnTaskId)
  return depIds.map((id) => taskById(data, id)).filter((t): t is Task => Boolean(t))
}

export function dependenciesOfTaskWithId(data: FullData, taskId: number): DepEntry[] {
  return data.dependencies
    .filter((d) => d.taskId === taskId)
    .map((d) => ({ depId: d.id, task: taskById(data, d.dependsOnTaskId) }))
    .filter((e): e is DepEntry => Boolean(e.task))
}

export function dependentsOfTask(data: FullData, taskId: number): Task[] {
  const ids = data.dependencies.filter((d) => d.dependsOnTaskId === taskId).map((d) => d.taskId)
  return ids.map((id) => taskById(data, id)).filter((t): t is Task => Boolean(t))
}

export function dependentsOfTaskWithId(data: FullData, taskId: number): DepEntry[] {
  return data.dependencies
    .filter((d) => d.dependsOnTaskId === taskId)
    .map((d) => ({ depId: d.id, task: taskById(data, d.taskId) }))
    .filter((e): e is DepEntry => Boolean(e.task))
}

// ---------- 书签 ----------

export function bookmarksForTask(data: FullData, taskId: number): Bookmark[] {
  return data.bookmarks
    .filter((b) => b.taskId === taskId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
}

// ---------- 搜索 ----------

export function searchData(data: FullData, query: string): { projects: Project[]; tasks: Task[]; users: User[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { projects: data.projects, tasks: data.tasks, users: data.users }
  return {
    projects: data.projects.filter((p) => p.name.toLowerCase().includes(q)),
    tasks: data.tasks.filter((t) => t.name.toLowerCase().includes(q)),
    users: data.users.filter((u) => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
  }
}
