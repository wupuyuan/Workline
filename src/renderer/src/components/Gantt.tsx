import { useMemo } from 'react'
import type { Bookmark, Task } from '@shared/types'
import { BOOKMARK_META } from '@shared/types'
import { addDays, daysBetween, parseDate, todayStr } from '../lib/format'

export interface GanttTaskRow {
  task: Task
  label: string
  personLabel?: string
  color: string
  role?: 'OWNER' | 'MEMBER'
}

export interface GanttSection {
  key: string
  title: string
  rows: GanttTaskRow[]
}

interface Column {
  key: string
  label: string
  widthPct: number
}

interface GanttProps {
  sections: GanttSection[]
  mode: 'week' | 'month'
  bookmarks: Map<number, Bookmark[]>
  selectedTaskId?: number | null
  focusTaskId?: number | null
  onSelectTask: (id: number) => void
  onSelectBookmark: (taskId: number, bookmarkId: number) => void
}

const LABEL_W = 220

export default function Gantt({
  sections,
  mode,
  bookmarks,
  selectedTaskId,
  focusTaskId,
  onSelectTask,
  onSelectBookmark
}: GanttProps): JSX.Element {
  const allTasks = useMemo(
    () => sections.flatMap((s) => s.rows.map((r) => r.task)),
    [sections]
  )

  const range = useMemo(() => {
    const focus = focusTaskId ? allTasks.find((t) => t.id === focusTaskId) : undefined
    let start: Date
    let end: Date
    if (focus) {
      start = addDays(parseDate(focus.startDate), -7)
      end = addDays(parseDate(focus.endDate), 7)
    } else if (allTasks.length > 0) {
      start = parseDate(allTasks[0].startDate)
      end = parseDate(allTasks[0].endDate)
      for (const t of allTasks) {
        const s = parseDate(t.startDate)
        const e = parseDate(t.endDate)
        if (s < start) start = s
        if (e > end) end = e
      }
    } else {
      const today = parseDate(todayStr())
      start = today
      end = addDays(today, 30)
    }
    if (mode === 'month') {
      start = new Date(start.getFullYear(), start.getMonth(), 1)
      end = new Date(end.getFullYear(), end.getMonth() + 1, 0)
    } else {
      const dow = (start.getDay() + 6) % 7
      start = addDays(start, -dow)
      end = addDays(end, 6 - ((end.getDay() + 6) % 7))
    }
    if (end <= start) end = addDays(start, 1)
    return { start, end }
  }, [allTasks, focusTaskId, mode])

  const totalDays = Math.max(1, daysBetween(range.start, range.end))
  const dayPx = mode === 'month' ? 4 : 8
  const minWidth = LABEL_W + totalDays * dayPx

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = []
    const cur = new Date(range.start)
    if (mode === 'month') {
      let idx = 0
      while (cur <= range.end) {
        const y = cur.getFullYear()
        const m = cur.getMonth()
        const monthStart = new Date(y, m, 1)
        const monthEnd = new Date(y, m + 1, 0)
        const days = daysBetween(monthStart, monthEnd) + 1
        const label = idx === 0 || m === 0 ? `${y}年${m + 1}月` : `${m + 1}月`
        cols.push({ key: `${y}-${m}`, label, widthPct: (days / totalDays) * 100 })
        cur.setMonth(cur.getMonth() + 1)
        idx++
      }
    } else {
      let idx = 0
      while (cur <= range.end) {
        const label = `${cur.getMonth() + 1}/${cur.getDate()}`
        cols.push({
          key: `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`,
          label,
          widthPct: (7 / totalDays) * 100
        })
        cur.setDate(cur.getDate() + 7)
        idx++
      }
    }
    return cols
  }, [range, mode, totalDays])

  const todayPct = useMemo(() => {
    const t = parseDate(todayStr())
    if (t < range.start || t > range.end) return null
    return (daysBetween(range.start, t) / totalDays) * 100
  }, [range, totalDays])

  const pct = (date: string): number => {
    const p = (daysBetween(range.start, parseDate(date)) / totalDays) * 100
    return Math.max(0, Math.min(100, p))
  }

  if (allTasks.length === 0) {
    return <div className="gantt-empty">暂无任务，点击「+」新建任务开始规划。</div>
  }

  return (
    <div className="gantt" style={{ minWidth }}>
      <div className="gantt-header" style={{ paddingLeft: LABEL_W }}>
        {columns.map((c) => (
          <div className="gantt-col" key={c.key} style={{ width: `${c.widthPct}%` }}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="gantt-body">
        {sections.map((s) => (
          <div key={s.key}>
            <div className="gantt-section">{s.title}</div>
            {s.rows.map((row) => {
              const startPct = pct(row.task.startDate)
              const endPct = pct(row.task.endDate)
              const widthPct = Math.max(0.6, endPct - startPct)
              const marks = bookmarks.get(row.task.id) ?? []
              const selected = selectedTaskId === row.task.id
              return (
                <div
                  key={row.task.id}
                  className={`gantt-row${selected ? ' selected' : ''}`}
                  onClick={() => onSelectTask(row.task.id)}
                >
                  <div className="gantt-label" style={{ width: LABEL_W }}>
                    <span className="gantt-task-name" title={row.label}>
                      {row.label}
                    </span>
                    {row.personLabel && (
                      <span className="gantt-person">{row.personLabel}</span>
                    )}
                  </div>
                  <div className="gantt-track">
                    {columns.map((c) => (
                      <div
                        className="gantt-gridline"
                        key={c.key}
                        style={{ left: `${c.widthPct}%` }}
                      />
                    ))}
                    {todayPct != null && (
                      <div className="gantt-today" style={{ left: `${todayPct}%` }} />
                    )}
                    <div
                      className="gantt-bar"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        borderColor: `${row.color}55`,
                        background: `${row.color}18`
                      }}
                    >
                      <div
                        className="gantt-bar-fill"
                        style={{ width: `${row.task.progress}%`, background: row.color }}
                      />
                      <span className="gantt-bar-text">{row.label}</span>
                    </div>
                    {marks.map((bm) => {
                      const meta = BOOKMARK_META[bm.type]
                      const left = pct(bm.date)
                      return (
                        <span
                          key={bm.id}
                          className="gantt-pin"
                          style={{ left: `${left}%`, color: meta.color }}
                          title={`${meta.icon} ${bm.title} (${bm.date})`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectBookmark(row.task.id, bm.id)
                          }}
                        >
                          {meta.icon}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function buildGanttSections(
  groups: { title: string; key: string; rows: GanttTaskRow[] }[]
): GanttSection[] {
  return groups.filter((g) => g.rows.length > 0)
}
