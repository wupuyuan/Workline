import { useEffect, useState } from 'react'
import type { DebugInfo, FullData } from '@shared/types'
import { api } from '../api'

interface DebugPanelProps {
  data: FullData | null
  onClose: () => void
  onReset: () => void
}

export default function DebugPanel({ data, onClose, onReset }: DebugPanelProps): JSX.Element {
  const [info, setInfo] = useState<DebugInfo | null>(null)
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    api.getDebugInfo().then(setInfo)
  }, [data])

  return (
    <aside className="debug-panel">
      <div className="debug-header">
        <span>调试面板</span>
        <button className="btn mini" onClick={onClose}>✕</button>
      </div>

      <div className="debug-section">
        <div className="debug-title">运行信息</div>
        {info && (
          <table className="debug-table">
            <tbody>
              <tr><td>数据库文件</td><td className="mono">{info.dbPath}</td></tr>
              <tr><td>用户数据目录</td><td className="mono">{info.userData}</td></tr>
              <tr><td>应用版本</td><td>{info.appVersion}</td></tr>
              <tr><td>Electron</td><td>{info.electronVersion}</td></tr>
              <tr><td>平台</td><td>{info.platform}</td></tr>
              <tr><td>打包模式</td><td>{info.isPackaged ? '已打包' : '开发模式'}</td></tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="debug-section">
        <div className="debug-title">数据统计</div>
        {info && (
          <table className="debug-table">
            <tbody>
              <tr><td>人员</td><td>{info.counts.users}</td></tr>
              <tr><td>项目</td><td>{info.counts.projects}</td></tr>
              <tr><td>任务</td><td>{info.counts.tasks}</td></tr>
              <tr><td>资源分配</td><td>{info.counts.assignments}</td></tr>
              <tr><td>书签</td><td>{info.counts.bookmarks}</td></tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="debug-section debug-actions">
        <button className="btn" onClick={() => api.openDevTools()}>打开 DevTools</button>
        <button className="btn danger" onClick={onReset}>重置并填充调试数据</button>
      </div>

      <div className="debug-section">
        <button className="btn" onClick={() => setShowJson((v) => !v)}>
          {showJson ? '收起' : '展开'} 全量数据 (JSON)
        </button>
        {showJson && data && (
          <pre className="debug-json">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </aside>
  )
}
