import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FullData, Project, Task } from '@shared/types'
import { api } from './api'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import DebugPanel from './components/DebugPanel'
import Modals, { type ModalState } from './components/Modals'
import { ProjectPanel, PersonPanel, type GanttMode } from './components/Panels'
import TaskDetail from './components/TaskDetail'
import BookmarkTimeline from './components/BookmarkTimeline'
import { projectById, taskById, userById } from './lib/model'

type View = 'project' | 'person'

export default function App(): JSX.Element {
  const [data, setData] = useState<FullData | null>(null)
  const [view, setView] = useState<View>('project')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [ganttMode, setGanttMode] = useState<GanttMode>('month')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [highlightBookmarkId, setHighlightBookmarkId] = useState<number | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setData(await api.getData())
  }, [])

  useEffect(() => {
    api.getData().then((d) => {
      setData(d)
      if (d.projects.length > 0) setSelectedProjectId(d.projects[0].id)
    })
  }, [])

  // ---------- 导航 ----------
  const selectProject = (id: number): void => {
    setView('project')
    setSelectedProjectId(id)
    setSelectedTaskId(null)
    setHighlightBookmarkId(null)
    setSearch('')
  }

  const selectTask = (id: number): void => {
    setSelectedTaskId(id)
    setHighlightBookmarkId(null)
    if (data) {
      const t = taskById(data, id)
      if (t) setSelectedProjectId(t.projectId)
    }
  }

  const selectUser = (id: number): void => {
    setView('person')
    setSelectedUserId(id)
    setSelectedTaskId(null)
    setSelectedProjectId(null)
    setHighlightBookmarkId(null)
    setSearch('')
  }

  const selectBookmark = (taskId: number, bookmarkId: number): void => {
    setSelectedTaskId(taskId)
    setHighlightBookmarkId(bookmarkId)
    if (data) {
      const t = taskById(data, taskId)
      if (t) setSelectedProjectId(t.projectId)
    }
  }

  // ---------- 数据变更 ----------
  const mutate = (fn: () => Promise<unknown>): void => {
    void fn().then(() => refresh())
  }

  const confirmDelete = (title: string, message: string, fn: () => Promise<unknown>): void => {
    setModal({ type: 'confirm', title, message, onConfirm: () => mutate(fn) })
  }

  const deleteTask = (task: Task): void => {
    confirmDelete('删除任务', `确定删除任务「${task.name}」及其书签、分配、依赖吗？`, () =>
      api.deleteTask(task.id)
    )
  }

  const deleteBookmark = (id: number): void => {
    confirmDelete('删除书签', '确定删除该书签吗？', () => api.deleteBookmark(id))
  }

  const deleteProject = (project: Project): void => {
    confirmDelete(
      '删除项目',
      `确定删除项目「${project.name}」及其全部任务吗？此操作不可撤销。`,
      () => api.deleteProject(project.id)
    )
  }

  // ---------- 右侧内容 ----------
  const selectedTask = selectedTaskId != null ? taskById(data ?? emptyData(), selectedTaskId) : undefined
  const selectedProject = data && selectedProjectId != null ? projectById(data, selectedProjectId) : undefined
  const selectedUser = data && selectedUserId != null ? userById(data, selectedUserId) : undefined

  const content = useMemo(() => {
    if (!data) return <div className="placeholder">加载中…</div>

    // 任务详情（含聚焦甘特图）
    if (selectedTask) {
      const project = projectById(data, selectedTask.projectId)
      return (
        <div className="content-task">
          {project && (
            <ProjectPanel
              data={data}
              project={project}
              mode={ganttMode}
              onModeChange={setGanttMode}
              selectedTaskId={selectedTask.id}
              onSelectTask={selectTask}
              onSelectBookmark={selectBookmark}
              onAdvance={openAdvanceProject}
              onAddTask={(p) => setModal({ type: 'task', projectId: p.id })}
              onEdit={openEditProject}
              onDelete={deleteProject}
            />
          )}
          <TaskDetail
            data={data}
            task={selectedTask}
            onEdit={(t) => setModal({ type: 'task', task: t })}
            onDelete={deleteTask}
            onAdvance={(t) => setModal({ type: 'advance-task', task: t })}
            onSelectUser={selectUser}
            onOpenProject={selectProject}
            onAddParticipant={(taskId, userId) => mutate(() => api.setAssignment(taskId, userId, 'MEMBER'))}
            onRemoveParticipant={(taskId, userId) => mutate(() => api.removeAssignment(taskId, userId))}
            onAddDep={(taskId, dependsOnTaskId) => mutate(() => api.addDependency(taskId, dependsOnTaskId))}
            onRemoveDep={(depId) => mutate(() => api.removeDependency(depId))}
          />
        </div>
      )
    }

    // 项目甘特图
    if (view === 'project' && selectedProject) {
      return (
        <ProjectPanel
          data={data}
          project={selectedProject}
          mode={ganttMode}
          onModeChange={setGanttMode}
          selectedTaskId={null}
          onSelectTask={selectTask}
          onSelectBookmark={selectBookmark}
          onAdvance={openAdvanceProject}
          onAddTask={(p) => setModal({ type: 'task', projectId: p.id })}
          onEdit={openEditProject}
          onDelete={deleteProject}
        />
      )
    }

    // 个人工作负载甘特图
    if (view === 'person' && selectedUser) {
      return (
        <PersonPanel
          data={data}
          user={selectedUser}
          projectFilterId={selectedProjectId}
          mode={ganttMode}
          onModeChange={setGanttMode}
          selectedTaskId={null}
          onSelectTask={selectTask}
          onSelectBookmark={selectBookmark}
          onClearFilter={() => setSelectedProjectId(null)}
        />
      )
    }

    return (
      <div className="placeholder">
        <div className="placeholder-icon">◈</div>
        <p>在左侧选择一个项目、任务或人员查看详情。</p>
        <p className="muted">提示：点击甘特条上的书签标记可跳转到对应时间线。</p>
      </div>
    )
  }, [
    data,
    view,
    selectedTask,
    selectedProject,
    selectedUser,
    selectedProjectId,
    ganttMode,
    highlightBookmarkId
  ])

  function openAdvanceProject(project: Project): void {
    setModal({ type: 'advance-project', project })
  }
  function openEditProject(project: Project): void {
    setModal({ type: 'project', project })
  }

  return (
    <div className="app">
      <Sidebar
        data={data ?? emptyData()}
        view={view}
        search={search}
        selectedProjectId={selectedProjectId}
        selectedUserId={selectedUserId}
        onViewChange={(v) => {
          setView(v)
          setSelectedTaskId(null)
          if (v === 'person' && !selectedUserId && data?.users[0]) setSelectedUserId(data.users[0].id)
        }}
        onSelectProject={selectProject}
        onSelectTask={selectTask}
        onSelectUser={selectUser}
        onEditUser={(user) => setModal({ type: 'user', user })}
        onNewProject={() => setModal({ type: 'project' })}
        onNewUser={() => setModal({ type: 'user' })}
      />

      <div className="app-body">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onOpenDebug={() => setShowDebug(true)}
        />
        <div className="body-main">
          <main className="content">{content}</main>
          {selectedTask && data && (
            <BookmarkTimeline
              data={data}
              task={selectedTask}
              highlightBookmarkId={highlightBookmarkId}
              onAddBookmark={(taskId) => setModal({ type: 'bookmark', taskId })}
              onEditBookmark={(bm) => setModal({ type: 'bookmark', taskId: bm.taskId, bookmark: bm })}
              onDeleteBookmark={deleteBookmark}
            />
          )}
          {showDebug && (
            <DebugPanel
              data={data}
              onClose={() => setShowDebug(false)}
              onReset={() => mutate(api.resetAndSeed)}
            />
          )}
        </div>
        <StatusBar data={data} />
      </div>

      {modal && (
        <Modals modal={modal} data={data ?? emptyData()} onClose={() => setModal(null)} onChanged={() => void refresh()} />
      )}
    </div>
  )
}

function emptyData(): FullData {
  return { users: [], projects: [], tasks: [], assignments: [], dependencies: [], bookmarks: [] }
}
