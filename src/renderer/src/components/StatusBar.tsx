import type { FullData } from '@shared/types'

interface StatusBarProps {
  data: FullData | null
}

export default function StatusBar({ data }: StatusBarProps): JSX.Element {
  const users = data?.users.length ?? 0
  const projects = data?.projects.length ?? 0
  const tasks = data?.tasks.length ?? 0
  const people = new Set(data?.assignments.map((a) => a.userId) ?? []).size
  return (
    <footer className="statusbar">
      <span>共 {projects} 个项目</span>
      <span>· {tasks} 个任务</span>
      <span>· {people} 人参与（{users} 人）</span>
      <span className="statusbar-right">Workline v0.1.0</span>
    </footer>
  )
}
