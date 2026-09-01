interface TopBarProps {
  search: string
  onSearchChange: (s: string) => void
  onOpenDebug: () => void
}

export default function TopBar(props: TopBarProps): JSX.Element {
  return (
    <header className="topbar">
      <div className="topbar-brand">⬡ Workline</div>

      <div className="topbar-search">
        <span className="search-icon">🔍</span>
        <input
          value={props.search}
          placeholder="搜索项目 / 任务 / 人员"
          onChange={(e) => props.onSearchChange(e.target.value)}
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-btn" title="调试面板" onClick={props.onOpenDebug}>⚙</button>
      </div>
    </header>
  )
}
