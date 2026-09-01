import type { Bookmark, FullData, Task } from '@shared/types'
import { BOOKMARK_META } from '@shared/types'
import { bookmarksForTask } from '../lib/model'

interface BookmarkTimelineProps {
  data: FullData
  task: Task
  highlightBookmarkId?: number | null
  onAddBookmark: (taskId: number) => void
  onEditBookmark: (bm: Bookmark) => void
  onDeleteBookmark: (id: number) => void
}

export default function BookmarkTimeline(props: BookmarkTimelineProps): JSX.Element {
  const { data, task } = props
  const marks = bookmarksForTask(data, task.id)

  return (
    <aside className="bookmark-drawer">
      <div className="detail-section-title">
        <span>书签时间线</span>
        <button className="icon-btn-add" onClick={() => props.onAddBookmark(task.id)} title="添加书签">+</button>
      </div>
      {marks.length === 0 ? (
        <div className="muted">暂无书签，点击「+」记录里程碑、需求变更、问题等。</div>
      ) : (
        <div className="timeline">
          {marks.map((bm) => {
            const meta = BOOKMARK_META[bm.type]
            const hl = props.highlightBookmarkId === bm.id
            return (
              <div key={bm.id} className={`timeline-item${hl ? ' highlight' : ''}`}>
                <div className="timeline-dot" style={{ background: meta.color }} />
                <div className="timeline-body">
                  <div className="timeline-head">
                    <span className="timeline-icon">{meta.icon}</span>
                    <span className="timeline-date">{bm.date}</span>
                    <span className="timeline-type" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="timeline-title">{bm.title}</div>
                  {bm.description && <div className="timeline-desc">{bm.description}</div>}
                </div>
                <div className="timeline-actions">
                  <button className="btn mini" onClick={() => props.onEditBookmark(bm)}>✎</button>
                  <button className="btn mini danger" onClick={() => props.onDeleteBookmark(bm.id)}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
