import type { FullData, User } from '@shared/types'
import { PROJECT_STATUS_LABEL } from '@shared/types'
import { searchData } from '../lib/model'
import { PROJECT_STATUS_COLOR } from '../lib/format'

interface SidebarProps {
  data: FullData
  view: 'project' | 'person'
  search: string
  selectedProjectId?: number | null
  selectedUserId?: number | null
  onViewChange: (v: 'project' | 'person') => void
  onSelectProject: (id: number) => void
  onSelectTask: (id: number) => void
  onSelectUser: (id: number) => void
  onEditUser: (user: User) => void
  onNewProject: () => void
  onNewUser: () => void
}

function projectIcon(status: string): string {
  switch (status) {
    case 'DONE':
      return '✓'
    case 'SUSPENDED':
      return '❚❚'
    default:
      return '◈'
  }
}

export default function Sidebar(props: SidebarProps): JSX.Element {
  const searching = props.search.trim().length > 0

  let list: JSX.Element
  if (searching) {
    const res = searchData(props.data, props.search)
    const hasAny = res.projects.length + res.tasks.length + res.users.length > 0
    list = (
      <>
        <div className="tree-group-title">搜索</div>
        {!hasAny && <div className="tree-empty">未找到匹配结果</div>}
        {res.projects.map((p) => (
          <div key={`sp${p.id}`} className="tree-node project" onClick={() => props.onSelectProject(p.id)}>
            <span className="tree-ico">{projectIcon(p.status)}</span>
            <span className="tree-label">{p.name}</span>
            <span className="tree-state" style={{ color: PROJECT_STATUS_COLOR[p.status] }}>
              {PROJECT_STATUS_LABEL[p.status]}
            </span>
          </div>
        ))}
        {res.tasks.map((t) => (
          <div key={`st${t.id}`} className="tree-node task" onClick={() => props.onSelectTask(t.id)}>
            <span className="tree-ico">▤</span>
            <span className="tree-label">{t.name}</span>
          </div>
        ))}
        {res.users.map((u) => (
          <div key={`su${u.id}`} className="tree-node person" onClick={() => props.onSelectUser(u.id)}>
            <span className="tree-ico">●</span>
            <span className="tree-label">{u.name}</span>
            <span className="tree-role">{u.role}</span>
          </div>
        ))}
      </>
    )
  } else if (props.view === 'project') {
    list = (
      <>
        {props.data.projects.map((p) => {
          const selected = props.selectedProjectId === p.id
          return (
            <div
              key={`p${p.id}`}
              className={`tree-node project${selected ? ' selected' : ''}`}
              onClick={() => props.onSelectProject(p.id)}
            >
              <span className="tree-ico">{projectIcon(p.status)}</span>
              <span className="tree-label">{p.name}</span>
              <span className="tree-state" style={{ color: PROJECT_STATUS_COLOR[p.status] }}>
                {PROJECT_STATUS_LABEL[p.status]}
              </span>
            </div>
          )
        })}
      </>
    )
  } else {
    list = (
      <>
        {props.data.users.map((u) => {
          const selected = props.selectedUserId === u.id
          return (
            <div
              key={`u${u.id}`}
              className={`tree-node person${selected ? ' selected' : ''}`}
              onClick={() => props.onSelectUser(u.id)}
            >
              <span className="tree-ico">●</span>
              <span className="tree-label">{u.name}</span>
              {u.employeeNo && <span className="tree-sub">{u.employeeNo}</span>}
              <span className="tree-role">{u.role}</span>
              <button
                className="tree-edit"
                title="编辑姓名 / 工号 / 角色"
                onClick={(e) => {
                  e.stopPropagation()
                  props.onEditUser(u)
                }}
              >
                ✎
              </button>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-switch">
        <select
          className="switch-select"
          title="切换维度"
          value={props.view}
          onChange={(e) => props.onViewChange(e.target.value as 'project' | 'person')}
        >
          <option value="project">项目</option>
          <option value="person">人员</option>
        </select>
        <button
          className="switch-add"
          title={props.view === 'project' ? '新建项目' : '新建人'}
          onClick={props.view === 'project' ? props.onNewProject : props.onNewUser}
        >
          +
        </button>
      </div>
      <div className="sidebar-list">{list}</div>
    </aside>
  )
}
