import { useMemo } from 'react'
import type { Bookmark, FullData, Project, User } from '@shared/types'
import { PROJECT_STATUS_LABEL, TASK_STAGE_LABEL } from '@shared/types'
import Gantt, { type GanttSection } from './Gantt'
import {
  groupedTasks,
  tasksGroupedByProjectForUser,
  taskOwner,
  bookmarksForTask
} from '../lib/model'
import {
  personColor,
  PROJECT_STATUS_COLOR,
  taskDisplayState,
  parseDate,
  daysBetween
} from '../lib/format'

export type GanttMode = 'week' | 'month'

function bookmarkMap(data: FullData, taskIds: number[]): Map<number, Bookmark[]> {
  const m = new Map<number, Bookmark[]>()
  for (const id of taskIds) {
    const bms = bookmarksForTask(data, id)
    if (bms.length) m.set(id, bms)
  }
  return m
}

interface CommonProps {
  data: FullData
  mode: GanttMode
  onModeChange: (m: GanttMode) => void
  selectedTaskId?: number | null
  onSelectTask: (id: number) => void
  onSelectBookmark: (taskId: number, bookmarkId: number) => void
}

// ---------------- 项目甘特图 ----------------

interface ProjectPanelProps extends CommonProps {
  project: Project
  focusTaskId?: number | null
  onAdvance: (project: Project) => void
  onAddTask: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectPanel(props: ProjectPanelProps): JSX.Element {
  const { data, project } = props

  const sections: GanttSection[] = useMemo(() => {
    return groupedTasks(data, project.id).map((g) => ({
      key: `${project.id}-${g.stage}`,
      title: `▤ ${TASK_STAGE_LABEL[g.stage]}`,
      rows: g.tasks.map((t) => {
        const owner = taskOwner(data, t.id)
        return {
          task: t,
          label: t.name,
          personLabel: owner?.name,
          color: owner ? personColor(owner.id) : '#555d6a',
          role: 'OWNER' as const
        }
      })
    }))
  }, [data, project.id])

  const bm = useMemo(
    () => bookmarkMap(data, sections.flatMap((s) => s.rows.map((r) => r.task.id))),
    [data, sections]
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span>{project.name}</span>
          <span className="panel-status" style={{ color: PROJECT_STATUS_COLOR[project.status] }}>
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
        </div>
        <div className="panel-tools">
          <select
            className="mode-select"
            value={props.mode}
            onChange={(e) => props.onModeChange(e.target.value as GanttMode)}
          >
            <option value="week">周视图</option>
            <option value="month">月视图</option>
          </select>
          <button className="btn small" title="流转" onClick={() => props.onAdvance(project)}>⇄</button>
          <button className="btn small" title="添加任务" onClick={() => props.onAddTask(project)}>+</button>
          <button className="btn small" title="编辑项目" onClick={() => props.onEdit(project)}>✎</button>
          <button className="btn small danger" title="删除项目" onClick={() => props.onDelete(project)}>✕</button>
        </div>
      </div>
      <div className="panel-meta">
        进度 {project.progress}% · {project.startDate} ~ {project.endDate}
        {project.description && <span className="muted"> · {project.description}</span>}
      </div>
      <Gantt
        sections={sections}
        mode={props.mode}
        bookmarks={bm}
        selectedTaskId={props.selectedTaskId}
        focusTaskId={props.focusTaskId}
        onSelectTask={props.onSelectTask}
        onSelectBookmark={props.onSelectBookmark}
      />
    </div>
  )
}

// ---------------- 个人工作负载甘特图 ----------------

interface PersonPanelProps extends CommonProps {
  user: User
  projectFilterId?: number | null
  onClearFilter: () => void
}

export function PersonPanel(props: PersonPanelProps): JSX.Element {
  const { data, user } = props

  const groups = useMemo(() => {
    const all = tasksGroupedByProjectForUser(data, user.id)
    return props.projectFilterId
      ? all.filter((g) => g.project.id === props.projectFilterId)
      : all
  }, [data, user.id, props.projectFilterId])

  const stats = useMemo(() => {
    const rows = groups.flatMap((g) => g.tasks)
    const active = rows.filter((t) => {
      const p = data.projects.find((pp) => pp.id === t.projectId)
      const s = taskDisplayState(t, p?.status === 'SUSPENDED')
      return s === '进行中' || s === '待开始'
    }).length
    const totalHours = rows.reduce((sum, t) => sum + hoursOf(t), 0)
    const usedHours = rows.reduce(
      (sum, t) => sum + Math.round((hoursOf(t) * t.progress) / 100),
      0
    )
    return {
      active,
      total: rows.length,
      workload: rows.length === 0 ? 0 : Math.round((active / rows.length) * 100),
      totalHours,
      usedHours,
      remainingHours: totalHours - usedHours
    }
  }, [groups, data])

  const overlaps = useMemo(() => {
    const rows = groups.flatMap((g) => g.tasks)
    const out: { a: string; b: string; from: string; to: string }[] = []
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i]
        const b = rows[j]
        const as = parseDate(a.startDate)
        const ae = parseDate(a.endDate)
        const bs = parseDate(b.startDate)
        const be = parseDate(b.endDate)
        const from = as > bs ? a.startDate : b.startDate
        const to = ae < be ? a.endDate : b.endDate
        if (daysBetween(parseDate(from), parseDate(to)) >= 0) {
          out.push({ a: a.name, b: b.name, from, to })
        }
      }
    }
    return out
  }, [groups])

  const sections: GanttSection[] = useMemo(() => {
    return groups.map((g) => ({
      key: `${user.id}-${g.project.id}`,
      title: `◈ ${g.project.name} · ${PROJECT_STATUS_LABEL[g.project.status]}`,
      rows: g.tasks.map((task) => ({
        task,
        label: task.name,
        color: personColor(user.id)
      }))
    }))
  }, [groups, user.id])

  const bm = useMemo(
    () => bookmarkMap(data, sections.flatMap((s) => s.rows.map((r) => r.task.id))),
    [data, sections]
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span>{user.name}</span>
          <span className="panel-status">{user.role}</span>
        </div>
        <div className="panel-tools">
          <select
            className="mode-select"
            value={props.mode}
            onChange={(e) => props.onModeChange(e.target.value as GanttMode)}
          >
            <option value="week">周视图</option>
            <option value="month">月视图</option>
          </select>
        </div>
      </div>
      <div className="panel-meta">
        {user.employeeNo && <span>{user.employeeNo}</span>}
        {user.employeeNo && <span>·</span>}
        <span>工时 {stats.active}/{stats.total} 进行中</span>
        <span>· 负载 {stats.workload}%</span>
        {props.projectFilterId && (
          <button className="btn mini" onClick={props.onClearFilter}>↺ 全部</button>
        )}
      </div>
      <Gantt
        sections={sections}
        mode={props.mode}
        bookmarks={bm}
        selectedTaskId={props.selectedTaskId}
        onSelectTask={props.onSelectTask}
        onSelectBookmark={props.onSelectBookmark}
      />
      <div className="panel-footer">
        <div className="workload-stats">
          总工时 {stats.totalHours}h · 已用 {stats.usedHours}h · 剩余 {stats.remainingHours}h
        </div>
        {overlaps.length > 0 && (
          <div className="overlap-warn">
            {overlaps.map((o, i) => (
              <div key={i}>⚠ {o.a} 与 {o.b} 时间重叠 ({o.from} ~ {o.to})</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function hoursOf(t: { startDate: string; endDate: string }): number {
  const days = daysBetween(parseDate(t.startDate), parseDate(t.endDate)) + 1
  return Math.max(0, days * 8)
}
