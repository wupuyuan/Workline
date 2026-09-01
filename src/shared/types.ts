// 全局共享类型与常量 —— 主进程 / 渲染进程 / preload 共用

/** 项目流转状态 */
export type ProjectStatus = 'INITIATED' | 'REQUIREMENT' | 'RUNNING' | 'SUSPENDED' | 'DONE'

/** 任务流转状态（流转规则见 plan.md） */
export type TaskStatus = 'REVIEW' | 'DEVELOPMENT' | 'TESTING' | 'DONE'

/** 任务所属阶段（用于树形分组） */
export type TaskStage = 'REQUIREMENT' | 'DEVELOPMENT' | 'TESTING'

/** 资源分配角色 */
export type AssignmentRole = 'OWNER' | 'MEMBER'

/** 锚点/书签类型 */
export type BookmarkType = 'REQUIREMENT_CHANGE' | 'MILESTONE' | 'ISSUE' | 'DECISION' | 'NOTE'

export interface User {
  id: number
  name: string
  role: string
  employeeNo: string
}

export interface Project {
  id: number
  name: string
  status: ProjectStatus
  /** 当前阶段负责人 */
  statusOwnerId: number | null
  ownerId: number | null
  startDate: string
  endDate: string
  progress: number
  description: string
}

export interface Task {
  id: number
  projectId: number
  name: string
  stage: TaskStage
  status: TaskStatus
  /** 当前流转责任人（评审人/开发者/测试人/确认人） */
  statusUserId: number | null
  ownerId: number | null
  startDate: string
  endDate: string
  progress: number
}

export interface Assignment {
  id: number
  taskId: number
  userId: number
  role: AssignmentRole
}

export interface TaskDependency {
  id: number
  taskId: number
  dependsOnTaskId: number
}

export interface Bookmark {
  id: number
  taskId: number
  type: BookmarkType
  title: string
  description: string
  date: string
}

/** 一次性拉取的全量快照 */
export interface FullData {
  users: User[]
  projects: Project[]
  tasks: Task[]
  assignments: Assignment[]
  dependencies: TaskDependency[]
  bookmarks: Bookmark[]
}

/** 调试信息（主进程返回） */
export interface DebugInfo {
  dbPath: string
  userData: string
  appVersion: string
  electronVersion: string
  platform: string
  isPackaged: boolean
  counts: {
    users: number
    projects: number
    tasks: number
    assignments: number
    bookmarks: number
  }
}

/** 创建/更新任务的输入 */
export interface TaskInput {
  projectId: number
  name: string
  stage: TaskStage
  status: TaskStatus
  statusUserId: number | null
  ownerId: number | null
  startDate: string
  endDate: string
  progress: number
}

export interface ProjectInput {
  name: string
  status: ProjectStatus
  statusOwnerId: number | null
  ownerId: number | null
  startDate: string
  endDate: string
  progress: number
  description: string
}

export interface UserInput {
  name: string
  role: string
  employeeNo: string
}

export interface BookmarkInput {
  taskId: number
  type: BookmarkType
  title: string
  description: string
  date: string
}

// ---------- 展示用常量 ----------

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  INITIATED: '立项',
  REQUIREMENT: '需求调研',
  RUNNING: '进行中',
  SUSPENDED: '挂起',
  DONE: '结束'
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  REVIEW: '需求评审',
  DEVELOPMENT: '开发',
  TESTING: '测试/验收',
  DONE: '结束'
}

/** 推进任务流转时，目标状态对应的责任人称呼 */
export const TASK_STATUS_OWNER_ROLE: Record<Exclude<TaskStatus, 'REVIEW'>, string> = {
  DEVELOPMENT: '开发者',
  TESTING: '测试人',
  DONE: '确认人'
}

export const TASK_STAGE_LABEL: Record<TaskStage, string> = {
  REQUIREMENT: '需求调研阶段',
  DEVELOPMENT: '开发阶段',
  TESTING: '测试阶段'
}

export const TASK_STAGE_ORDER: TaskStage[] = ['REQUIREMENT', 'DEVELOPMENT', 'TESTING']

export const BOOKMARK_META: Record<
  BookmarkType,
  { label: string; color: string; icon: string }
> = {
  REQUIREMENT_CHANGE: { label: '需求变更', color: '#ef4444', icon: '\u25B3' },
  MILESTONE:          { label: '里程碑', color: '#22c55e', icon: '\u25C6' },
  ISSUE:              { label: '问题/风险', color: '#f97316', icon: '\u25CF' },
  DECISION:           { label: '决策记录', color: '#3b82f6', icon: '\u25CB' },
  NOTE:               { label: '一般备注', color: '#8a8f98', icon: '\u25A0' }
}

export const BOOKMARK_TYPE_ORDER: BookmarkType[] = [
  'MILESTONE',
  'DECISION',
  'REQUIREMENT_CHANGE',
  'ISSUE',
  'NOTE'
]

// ---------- IPC 接口（preload 暴露给渲染进程） ----------

export interface WorklineApi {
  getData(): Promise<FullData>
  getDebugInfo(): Promise<DebugInfo>
  resetAndSeed(): Promise<FullData>

  createUser(input: UserInput): Promise<FullData>
  updateUser(id: number, input: UserInput): Promise<FullData>
  deleteUser(id: number): Promise<FullData>

  createProject(input: ProjectInput): Promise<FullData>
  updateProject(id: number, input: ProjectInput): Promise<FullData>
  deleteProject(id: number): Promise<FullData>
  advanceProject(id: number, toStatus: ProjectStatus, ownerId: number | null): Promise<FullData>

  createTask(input: TaskInput): Promise<FullData>
  updateTask(id: number, input: TaskInput): Promise<FullData>
  advanceTask(id: number, toStatus: TaskStatus, statusUserId: number | null): Promise<FullData>
  deleteTask(id: number): Promise<FullData>

  setAssignment(taskId: number, userId: number, role: AssignmentRole): Promise<FullData>
  removeAssignment(taskId: number, userId: number): Promise<FullData>

  addDependency(taskId: number, dependsOnTaskId: number): Promise<FullData>
  removeDependency(id: number): Promise<FullData>

  addBookmark(input: BookmarkInput): Promise<FullData>
  updateBookmark(id: number, input: BookmarkInput): Promise<FullData>
  deleteBookmark(id: number): Promise<FullData>

  openDevTools(): void
}
