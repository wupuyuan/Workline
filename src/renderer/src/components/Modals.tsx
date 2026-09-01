import { useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Bookmark,
  BookmarkInput,
  BookmarkType,
  FullData,
  Project,
  ProjectInput,
  ProjectStatus,
  Task,
  TaskInput,
  TaskStage,
  TaskStatus,
  User,
  UserInput
} from '@shared/types'
import {
  BOOKMARK_META,
  BOOKMARK_TYPE_ORDER,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  TASK_STAGE_LABEL,
  TASK_STAGE_ORDER,
  TASK_STATUS_OWNER_ROLE
} from '@shared/types'
import { api } from '../api'

export type ModalState =
  | { type: 'project'; project?: Project }
  | { type: 'task'; projectId?: number; task?: Task }
  | { type: 'user'; user?: User }
  | { type: 'bookmark'; taskId: number; bookmark?: Bookmark }
  | { type: 'advance-task'; task: Task }
  | { type: 'advance-project'; project: Project }
  | { type: 'confirm'; title: string; message: string; onConfirm: () => void }

interface ModalsProps {
  modal: ModalState
  data: FullData
  onClose: () => void
  onChanged: () => void
}

const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  INITIATED: ['REQUIREMENT', 'SUSPENDED'],
  REQUIREMENT: ['RUNNING', 'SUSPENDED'],
  RUNNING: ['DONE', 'SUSPENDED'],
  SUSPENDED: ['RUNNING', 'DONE'],
  DONE: []
}

const TASK_NEXT: Record<Exclude<TaskStatus, 'DONE'>, Exclude<TaskStatus, 'REVIEW'>> = {
  REVIEW: 'DEVELOPMENT',
  DEVELOPMENT: 'TESTING',
  TESTING: 'DONE'
}

export default function Modals({ modal, data, onClose, onChanged }: ModalsProps): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {modal.type === 'project' && (
          <ProjectForm modal={modal} data={data} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'task' && (
          <TaskForm modal={modal} data={data} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'user' && (
          <UserForm modal={modal} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'bookmark' && (
          <BookmarkForm modal={modal} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'advance-task' && (
          <AdvanceTaskForm modal={modal} data={data} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'advance-project' && (
          <AdvanceProjectForm modal={modal} data={data} onClose={onClose} onChanged={onChanged} />
        )}
        {modal.type === 'confirm' && <ConfirmForm modal={modal} onClose={onClose} />}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {children}
    </label>
  )
}

function ProjectForm({
  modal,
  data,
  onClose,
  onChanged
}: {
  modal: { type: 'project'; project?: Project }
  data: FullData
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const p = modal.project
  const [name, setName] = useState(p?.name ?? '')
  const [status, setStatus] = useState<ProjectStatus>(p?.status ?? 'INITIATED')
  const [ownerId, setOwnerId] = useState<number | null>(p?.ownerId ?? null)
  const [statusOwnerId, setStatusOwnerId] = useState<number | null>(p?.statusOwnerId ?? null)
  const [startDate, setStartDate] = useState(p?.startDate ?? '2026-09-01')
  const [endDate, setEndDate] = useState(p?.endDate ?? '2026-09-30')
  const [progress, setProgress] = useState(p?.progress ?? 0)
  const [description, setDescription] = useState(p?.description ?? '')

  const submit = async (): Promise<void> => {
    if (!name.trim()) return
    const input: ProjectInput = {
      name: name.trim(),
      status,
      ownerId,
      statusOwnerId,
      startDate,
      endDate,
      progress,
      description
    }
    if (p) await api.updateProject(p.id, input)
    else await api.createProject(input)
    onChanged()
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>{p ? '编辑项目' : '新建项目'}</h2>
      <Field label="项目名称">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="状态">
        <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
          {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="负责人">
        <select
          value={ownerId ?? ''}
          onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">未指定</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
          ))}
        </select>
      </Field>
      <Field label="当前阶段负责人">
        <select
          value={statusOwnerId ?? ''}
          onChange={(e) => setStatusOwnerId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">未指定</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
          ))}
        </select>
      </Field>
      <div className="form-row">
        <Field label="开始日期">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="结束日期">
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label={`进度 ${progress}%`}>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </Field>
      <Field label="描述">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary">保存</button>
      </div>
    </form>
  )
}

function TaskForm({
  modal,
  data,
  onClose,
  onChanged
}: {
  modal: { type: 'task'; projectId?: number; task?: Task }
  data: FullData
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const t = modal.task
  const [projectId, setProjectId] = useState(t?.projectId ?? modal.projectId ?? data.projects[0]?.id ?? 0)
  const [name, setName] = useState(t?.name ?? '')
  const [stage, setStage] = useState<TaskStage>(t?.stage ?? 'REQUIREMENT')
  const [status, setStatus] = useState<TaskStatus>(t?.status ?? 'REVIEW')
  const [ownerId, setOwnerId] = useState<number | null>(t?.ownerId ?? null)
  const [statusUserId, setStatusUserId] = useState<number | null>(t?.statusUserId ?? null)
  const [startDate, setStartDate] = useState(t?.startDate ?? '2026-09-01')
  const [endDate, setEndDate] = useState(t?.endDate ?? '2026-09-14')
  const [progress, setProgress] = useState(t?.progress ?? 0)

  const submit = async (): Promise<void> => {
    if (!name.trim() || !projectId) return
    const input: TaskInput = {
      projectId,
      name: name.trim(),
      stage,
      status,
      ownerId,
      statusUserId,
      startDate,
      endDate,
      progress
    }
    if (t) await api.updateTask(t.id, input)
    else await api.createTask(input)
    onChanged()
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>{t ? '编辑任务' : '新建任务'}</h2>
      <Field label="所属项目">
        <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
          {data.projects.map((pr) => (
            <option key={pr.id} value={pr.id}>{pr.name}</option>
          ))}
        </select>
      </Field>
      <Field label="任务名称">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="阶段">
        <select value={stage} onChange={(e) => setStage(e.target.value as TaskStage)}>
          {TASK_STAGE_ORDER.map((s) => (
            <option key={s} value={s}>{TASK_STAGE_LABEL[s]}</option>
          ))}
        </select>
      </Field>
      <Field label="流转状态">
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
          {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <div className="form-row">
        <Field label="负责人">
          <select value={ownerId ?? ''} onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">未指定</option>
            {data.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="当前责任人">
          <select
            value={statusUserId ?? ''}
            onChange={(e) => setStatusUserId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">未指定</option>
            {data.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="开始日期">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="结束日期">
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label={`进度 ${progress}%`}>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary">保存</button>
      </div>
    </form>
  )
}

function UserForm({
  modal,
  onClose,
  onChanged
}: {
  modal: { type: 'user'; user?: User }
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const u = modal.user
  const [name, setName] = useState(u?.name ?? '')
  const [role, setRole] = useState(u?.role ?? '')
  const [employeeNo, setEmployeeNo] = useState(u?.employeeNo ?? '')

  const submit = async (): Promise<void> => {
    if (!name.trim()) return
    const input: UserInput = { name: name.trim(), role: role.trim(), employeeNo: employeeNo.trim() }
    if (u) await api.updateUser(u.id, input)
    else await api.createUser(input)
    onChanged()
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>{u ? '编辑人员' : '新增人员'}</h2>
      <Field label="姓名">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="工号">
        <input value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} placeholder="如：E1001" />
      </Field>
      <Field label="职位 / 角色">
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="如：产品经理" />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary">保存</button>
      </div>
    </form>
  )
}

function BookmarkForm({
  modal,
  onClose,
  onChanged
}: {
  modal: { type: 'bookmark'; taskId: number; bookmark?: Bookmark }
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const b = modal.bookmark
  const [type, setType] = useState<BookmarkType>(b?.type ?? 'NOTE')
  const [title, setTitle] = useState(b?.title ?? '')
  const [description, setDescription] = useState(b?.description ?? '')
  const [date, setDate] = useState(b?.date ?? '2026-09-01')

  const submit = async (): Promise<void> => {
    if (!title.trim()) return
    const input: BookmarkInput = {
      taskId: modal.taskId,
      type,
      title: title.trim(),
      description: description.trim(),
      date
    }
    if (b) await api.updateBookmark(b.id, input)
    else await api.addBookmark(input)
    onChanged()
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>{b ? '编辑书签' : '添加书签'}</h2>
      <Field label="类型">
        <select value={type} onChange={(e) => setType(e.target.value as BookmarkType)}>
          {BOOKMARK_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>{BOOKMARK_META[t].icon} {BOOKMARK_META[t].label}</option>
          ))}
        </select>
      </Field>
      <Field label="标题">
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="发生时间">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="描述">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary">保存</button>
      </div>
    </form>
  )
}

function AdvanceTaskForm({
  modal,
  data,
  onClose,
  onChanged
}: {
  modal: { type: 'advance-task'; task: Task }
  data: FullData
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const task = modal.task
  const next = TASK_NEXT[task.status as Exclude<TaskStatus, 'DONE'>]
  const [statusUserId, setStatusUserId] = useState<number | null>(task.statusUserId)

  if (!next) return <></>

  const submit = async (): Promise<void> => {
    if (statusUserId == null) return
    await api.advanceTask(task.id, next, statusUserId)
    onChanged()
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>任务流转</h2>
      <div className="flow-summary">
        <div>{task.name}</div>
        <div>
          {TASK_STATUS_LABEL[task.status]} → {TASK_STATUS_LABEL[next]}
        </div>
      </div>
      <Field label={`指定${TASK_STATUS_OWNER_ROLE[next]}（必填）`}>
        <select
          value={statusUserId ?? ''}
          onChange={(e) => setStatusUserId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">请选择</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
          ))}
        </select>
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary" disabled={statusUserId == null}>
          确认流转
        </button>
      </div>
    </form>
  )
}

function AdvanceProjectForm({
  modal,
  data,
  onClose,
  onChanged
}: {
  modal: { type: 'advance-project'; project: Project }
  data: FullData
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const project = modal.project
  const options = PROJECT_TRANSITIONS[project.status]
  const [toStatus, setToStatus] = useState<ProjectStatus>(options[0] ?? 'DONE')
  const [ownerId, setOwnerId] = useState<number | null>(project.statusOwnerId ?? project.ownerId)

  const submit = async (): Promise<void> => {
    await api.advanceProject(project.id, toStatus, ownerId)
    onChanged()
    onClose()
  }

  if (options.length === 0) {
    return (
      <>
        <h2>项目流转</h2>
        <div className="flow-summary">该项目已结束，无后续流转。</div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
      </>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2>项目流转</h2>
      <div className="flow-summary">
        <div>{project.name}</div>
        <div>
          {PROJECT_STATUS_LABEL[project.status]} → {PROJECT_STATUS_LABEL[toStatus]}
        </div>
      </div>
      <Field label="目标状态">
        <select value={toStatus} onChange={(e) => setToStatus(e.target.value as ProjectStatus)}>
          {options.map((o) => (
            <option key={o} value={o}>{PROJECT_STATUS_LABEL[o]}</option>
          ))}
        </select>
      </Field>
      <Field label="该阶段负责人">
        <select
          value={ownerId ?? ''}
          onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">未指定</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
          ))}
        </select>
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>取消</button>
        <button type="submit" className="btn primary">确认流转</button>
      </div>
    </form>
  )
}

function ConfirmForm({
  modal,
  onClose
}: {
  modal: { type: 'confirm'; title: string; message: string; onConfirm: () => void }
  onClose: () => void
}): JSX.Element {
  return (
    <>
      <h2>{modal.title}</h2>
      <div className="confirm-message">{modal.message}</div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>取消</button>
        <button
          className="btn danger"
          onClick={() => {
            modal.onConfirm()
            onClose()
          }}
        >
          确认
        </button>
      </div>
    </>
  )
}
