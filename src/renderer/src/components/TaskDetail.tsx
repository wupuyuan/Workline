import { useMemo } from 'react'
import type { FullData, Task } from '@shared/types'
import {
  TASK_STATUS_LABEL,
  TASK_STAGE_LABEL,
  TASK_STATUS_OWNER_ROLE
} from '@shared/types'
import {
  dependenciesOfTaskWithId,
  dependentsOfTaskWithId,
  projectById,
  taskOwner,
  userById,
  usersForTask
} from '../lib/model'
import { displayStateColor, taskDisplayState, TASK_STATUS_COLOR } from '../lib/format'

interface TaskDetailProps {
  data: FullData
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onAdvance: (task: Task) => void
  onSelectUser: (id: number) => void
  onOpenProject: (id: number) => void
  onAddParticipant: (taskId: number, userId: number) => void
  onRemoveParticipant: (taskId: number, userId: number) => void
  onAddDep: (taskId: number, dependsOnTaskId: number) => void
  onRemoveDep: (depId: number) => void
}

export default function TaskDetail(props: TaskDetailProps): JSX.Element {
  const { data, task } = props
  const project = projectById(data, task.projectId)
  const owner = taskOwner(data, task.id)
  const statusUser = userById(data, task.statusUserId)
  const people = usersForTask(data, task.id)
  const availableUsers = data.users.filter((u) => !people.some((p) => p.user.id === u.id))
  const deps = dependenciesOfTaskWithId(data, task.id)
  const dependents = dependentsOfTaskWithId(data, task.id)
  const suspended = project?.status === 'SUSPENDED'
  const state = taskDisplayState(task, suspended)

  // 同项目其他任务（作为可选依赖源）
  const projectTasks = useMemo(
    () => data.tasks.filter((t) => t.projectId === task.projectId && t.id !== task.id),
    [data.tasks, task.projectId, task.id]
  )

  const nextStep =
    task.status === 'REVIEW'
      ? { to: 'DEVELOPMENT' as const, label: '推进到开发' }
      : task.status === 'DEVELOPMENT'
        ? { to: 'TESTING' as const, label: '推进到测试/验收' }
        : task.status === 'TESTING'
          ? { to: 'DONE' as const, label: '结束任务' }
          : null

  return (
    <div className="task-detail">
      <div className="detail-header">
        <div className="detail-title">
          <span className="detail-name">{task.name}</span>
          <span className="detail-state" style={{ color: displayStateColor(state) }}>
            {state}
          </span>
        </div>
        <div className="detail-actions">
          <button className="btn" onClick={() => props.onEdit(task)}>✎ 编辑</button>
          <button className="btn danger" onClick={() => props.onDelete(task)}>✕ 删除</button>
        </div>
      </div>

      <div className="detail-meta">
        <div className="meta-item">
          <label>所属项目</label>
          <a className="link" onClick={() => props.onOpenProject(task.projectId)}>
            {projectIcon(project?.status)} {project?.name ?? '—'}
          </a>
        </div>
        <div className="meta-item">
          <label>阶段</label>
          <span>{TASK_STAGE_LABEL[task.stage]}</span>
        </div>
        <div className="meta-item">
          <label>流转状态</label>
          <span style={{ color: TASK_STATUS_COLOR[task.status] }}>
            {TASK_STATUS_LABEL[task.status]}
          </span>
        </div>
        <div className="meta-item">
          <label>负责人</label>
          <a className="link" onClick={() => owner && props.onSelectUser(owner.id)}>
            ● {owner?.name ?? '—'}
          </a>
        </div>
        <div className="meta-item">
          <label>当前责任人</label>
          <a className="link" onClick={() => statusUser && props.onSelectUser(statusUser.id)}>
            ● {statusUser?.name ?? '—'}
          </a>
        </div>
        <div className="meta-item">
          <label>起止日期</label>
          <span>{task.startDate} ~ {task.endDate}</span>
        </div>
        <div className="meta-item">
          <label>进度</label>
          <span>{task.progress}%</span>
        </div>
      </div>

      <div className="detail-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${task.progress}%` }} />
        </div>
      </div>

      {/* 流转区 */}
      <div className="detail-section">
        <div className="detail-section-title">任务流转</div>
        {nextStep ? (
          <div className="flow-box">
            <span>
              当前：<b>{TASK_STATUS_LABEL[task.status]}</b>，下一步：
              <b>{nextStep.label}</b>（需指定 {TASK_STATUS_OWNER_ROLE[nextStep.to]}）
            </span>
            <button className="btn primary" onClick={() => props.onAdvance(task)}>
              {nextStep.label} →
            </button>
          </div>
        ) : (
          <div className="flow-box">任务已结束。</div>
        )}
      </div>

      {/* 参与人员 */}
      <div className="detail-section">
        <div className="detail-section-title">参与人员</div>
        {people.length === 0 ? (
          <div className="muted">暂无人员</div>
        ) : (
          <div className="chip-list">
            {people.map(({ user, role }) => (
              <span key={user.id} className="chip">
                <a className="link" onClick={() => props.onSelectUser(user.id)}>
                  ● {user.name}
                </a>
                <span className="chip-role">{role === 'OWNER' ? '负责人' : '参与人'}</span>
                {role === 'MEMBER' && (
                  <button
                    className="chip-remove"
                    title="移除参与人"
                    onClick={() => props.onRemoveParticipant(task.id, user.id)}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <select
          className="participant-select"
          value=""
          onChange={(e) => {
            const uid = Number(e.target.value)
            if (uid) props.onAddParticipant(task.id, uid)
          }}
        >
          <option value="">+ 添加参与人</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.role}
            </option>
          ))}
        </select>
      </div>

      {/* 依赖 */}
      <div className="detail-section">
        <div className="detail-section-title">任务依赖</div>
        <div className="dep-rows">
          <div className="dep-group">
            <label className="muted">前置任务</label>
            <div className="dep-tags">
              {deps.length === 0 && <span className="muted">无</span>}
              {deps.map((d) => (
                <div key={d.depId} className="dep-tag">
                  → {d.task.name}
                  <button className="dep-remove" onClick={() => props.onRemoveDep(d.depId)} title="移除依赖">✕</button>
                </div>
              ))}
            </div>
            <select
              className="participant-select"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value)
                if (id) { props.onAddDep(task.id, id); e.currentTarget.value = '' }
              }}
            >
              <option value="">+ 添加前置任务</option>
              {projectTasks.filter((t) => !deps.some((d) => d.task.id === t.id)).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="dep-group">
            <label className="muted">后续任务</label>
            <div className="dep-tags">
              {dependents.length === 0 && <span className="muted">无</span>}
              {dependents.map((d) => (
                <div key={d.depId} className="dep-tag">
                  ← {d.task.name}
                  <button className="dep-remove" onClick={() => props.onRemoveDep(d.depId)} title="移除依赖">✕</button>
                </div>
              ))}
            </div>
            <select
              className="participant-select"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value)
                if (id) { props.onAddDep(id, task.id); e.currentTarget.value = '' }
              }}
            >
              <option value="">+ 添加后续任务</option>
              {projectTasks.filter((t) => !dependents.some((d) => d.task.id === t.id)).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function projectIcon(status: string | undefined): string {
  switch (status) {
    case 'DONE':
      return '✓'
    default:
      return '◈'
  }
}
