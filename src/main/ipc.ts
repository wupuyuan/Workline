import { ipcMain, BrowserWindow, app } from 'electron'
import type { Database } from 'sql.js'
import type {
  Assignment,
  AssignmentRole,
  Bookmark,
  BookmarkInput,
  FullData,
  Project,
  ProjectInput,
  ProjectStatus,
  Task,
  TaskDependency,
  TaskInput,
  TaskStatus,
  User,
  UserInput
} from '@shared/types'
import { getDb, getDbPath, queryAll, queryOne, run, saveDb } from './db'
import { resetAndSeed } from './seed'

export function loadData(db: Database): FullData {
  return {
    users: queryAll<User>(db, 'SELECT * FROM users ORDER BY id'),
    projects: queryAll<Project>(db, 'SELECT * FROM projects ORDER BY id'),
    tasks: queryAll<Task>(db, 'SELECT * FROM tasks ORDER BY id'),
    assignments: queryAll<Assignment>(db, 'SELECT * FROM assignments ORDER BY id'),
    dependencies: queryAll<TaskDependency>(db, 'SELECT * FROM dependencies ORDER BY id'),
    bookmarks: queryAll<Bookmark>(db, 'SELECT * FROM bookmarks ORDER BY date, id')
  }
}

export function registerIpcHandlers(): void {
  const db = getDb()

  /** 变更后：落盘 + 返回最新快照 */
  const commit = (): FullData => {
    saveDb()
    return loadData(db)
  }

  // ---------- 数据快照 / 调试 ----------
  ipcMain.handle('data:get', () => loadData(db))

  ipcMain.handle('debug:info', () => {
    const counts = {
      users: queryOne<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM users')?.c ?? 0,
      projects: queryOne<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM projects')?.c ?? 0,
      tasks: queryOne<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM tasks')?.c ?? 0,
      assignments: queryOne<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM assignments')?.c ?? 0,
      bookmarks: queryOne<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM bookmarks')?.c ?? 0
    }
    return {
      dbPath: getDbPath(),
      userData: app.getPath('userData'),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      isPackaged: app.isPackaged,
      counts
    }
  })

  ipcMain.handle('debug:reset', () => {
    resetAndSeed(db)
    return commit()
  })

  ipcMain.handle('debug:open-devtools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.webContents.openDevTools()
  })

  // ---------- 用户 ----------
  ipcMain.handle('user:create', (_e, input: UserInput) => {
    run(db, 'INSERT INTO users (name, role, employeeNo) VALUES (?, ?, ?)', [input.name, input.role, input.employeeNo])
    return commit()
  })
  ipcMain.handle('user:update', (_e, id: number, input: UserInput) => {
    run(db, 'UPDATE users SET name = ?, role = ?, employeeNo = ? WHERE id = ?', [input.name, input.role, input.employeeNo, id])
    return commit()
  })
  ipcMain.handle('user:delete', (_e, id: number) => {
    run(db, 'DELETE FROM assignments WHERE userId = ?', [id])
    run(db, 'DELETE FROM users WHERE id = ?', [id])
    return commit()
  })

  // ---------- 项目 ----------
  ipcMain.handle('project:create', (_e, input: ProjectInput) => {
    run(
      db,
      `INSERT INTO projects (name, status, statusOwnerId, ownerId, startDate, endDate, progress, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.status,
        input.statusOwnerId,
        input.ownerId,
        input.startDate,
        input.endDate,
        input.progress,
        input.description
      ]
    )
    return commit()
  })
  ipcMain.handle('project:update', (_e, id: number, input: ProjectInput) => {
    run(
      db,
      `UPDATE projects SET name = ?, status = ?, statusOwnerId = ?, ownerId = ?, startDate = ?, endDate = ?, progress = ?, description = ?
       WHERE id = ?`,
      [
        input.name,
        input.status,
        input.statusOwnerId,
        input.ownerId,
        input.startDate,
        input.endDate,
        input.progress,
        input.description,
        id
      ]
    )
    return commit()
  })
  ipcMain.handle('project:advance', (_e, id: number, toStatus: ProjectStatus, ownerId: number | null) => {
    if (toStatus === 'DONE') {
      run(db, 'UPDATE projects SET status = ?, statusOwnerId = ?, progress = 100 WHERE id = ?', [
        toStatus,
        ownerId,
        id
      ])
    } else {
      run(db, 'UPDATE projects SET status = ?, statusOwnerId = ? WHERE id = ?', [toStatus, ownerId, id])
    }
    return commit()
  })
  ipcMain.handle('project:delete', (_e, id: number) => {
    const taskIds = queryAll<{ id: number }>(db, 'SELECT id FROM tasks WHERE projectId = ?', [id]).map((r) => r.id)
    for (const tid of taskIds) {
      run(db, 'DELETE FROM bookmarks WHERE taskId = ?', [tid])
      run(db, 'DELETE FROM assignments WHERE taskId = ?', [tid])
      run(db, 'DELETE FROM dependencies WHERE taskId = ? OR dependsOnTaskId = ?', [tid, tid])
    }
    run(db, 'DELETE FROM tasks WHERE projectId = ?', [id])
    run(db, 'DELETE FROM projects WHERE id = ?', [id])
    return commit()
  })

  // ---------- 任务 ----------
  ipcMain.handle('task:create', (_e, input: TaskInput) => {
    run(
      db,
      `INSERT INTO tasks (projectId, name, stage, status, statusUserId, ownerId, startDate, endDate, progress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.projectId,
        input.name,
        input.stage,
        input.status,
        input.statusUserId,
        input.ownerId,
        input.startDate,
        input.endDate,
        input.progress
      ]
    )
    return commit()
  })
  ipcMain.handle('task:update', (_e, id: number, input: TaskInput) => {
    run(
      db,
      `UPDATE tasks SET projectId = ?, name = ?, stage = ?, status = ?, statusUserId = ?, ownerId = ?, startDate = ?, endDate = ?, progress = ?
       WHERE id = ?`,
      [
        input.projectId,
        input.name,
        input.stage,
        input.status,
        input.statusUserId,
        input.ownerId,
        input.startDate,
        input.endDate,
        input.progress,
        id
      ]
    )
    return commit()
  })
  ipcMain.handle('task:advance', (_e, id: number, toStatus: TaskStatus, statusUserId: number | null) => {
    if (toStatus === 'DONE') {
      run(db, 'UPDATE tasks SET status = ?, statusUserId = ?, progress = 100 WHERE id = ?', [
        toStatus,
        statusUserId,
        id
      ])
    } else {
      run(db, 'UPDATE tasks SET status = ?, statusUserId = ? WHERE id = ?', [toStatus, statusUserId, id])
    }
    return commit()
  })
  ipcMain.handle('task:delete', (_e, id: number) => {
    run(db, 'DELETE FROM bookmarks WHERE taskId = ?', [id])
    run(db, 'DELETE FROM assignments WHERE taskId = ?', [id])
    run(db, 'DELETE FROM dependencies WHERE taskId = ? OR dependsOnTaskId = ?', [id, id])
    run(db, 'DELETE FROM tasks WHERE id = ?', [id])
    return commit()
  })

  // ---------- 资源分配 ----------
  ipcMain.handle('assign:set', (_e, taskId: number, userId: number, role: AssignmentRole) => {
    run(
      db,
      `INSERT INTO assignments (taskId, userId, role) VALUES (?, ?, ?)
       ON CONFLICT(taskId, userId) DO UPDATE SET role = excluded.role`,
      [taskId, userId, role]
    )
    return commit()
  })
  ipcMain.handle('assign:remove', (_e, taskId: number, userId: number) => {
    run(db, 'DELETE FROM assignments WHERE taskId = ? AND userId = ?', [taskId, userId])
    return commit()
  })

  // ---------- 任务依赖 ----------
  ipcMain.handle('dep:add', (_e, taskId: number, dependsOnTaskId: number) => {
    run(db, 'INSERT OR IGNORE INTO dependencies (taskId, dependsOnTaskId) VALUES (?, ?)', [taskId, dependsOnTaskId])
    return commit()
  })
  ipcMain.handle('dep:remove', (_e, id: number) => {
    run(db, 'DELETE FROM dependencies WHERE id = ?', [id])
    return commit()
  })

  // ---------- 锚点/书签 ----------
  ipcMain.handle('bookmark:add', (_e, input: BookmarkInput) => {
    run(db, 'INSERT INTO bookmarks (taskId, type, title, description, date) VALUES (?, ?, ?, ?, ?)', [
      input.taskId,
      input.type,
      input.title,
      input.description,
      input.date
    ])
    return commit()
  })
  ipcMain.handle('bookmark:update', (_e, id: number, input: BookmarkInput) => {
    run(db, 'UPDATE bookmarks SET taskId = ?, type = ?, title = ?, description = ?, date = ? WHERE id = ?', [
      input.taskId,
      input.type,
      input.title,
      input.description,
      input.date,
      id
    ])
    return commit()
  })
  ipcMain.handle('bookmark:delete', (_e, id: number) => {
    run(db, 'DELETE FROM bookmarks WHERE id = ?', [id])
    return commit()
  })
}
