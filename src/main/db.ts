import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'

let SQL: import('sql.js').SqlJsStatic | null = null
let db: Database | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'workline.sqlite')
}

/** 异步初始化 sql.js（WASM）并加载/创建数据库文件，然后执行迁移 */
export async function initDb(): Promise<void> {
  // 定位 sql.js 的 wasm 文件（通过 require.resolve 找到包目录，再用 fs 读取，
  // 避免依赖运行时的 fetch/locateFile）
  const distDir = dirname(require.resolve('sql.js'))
  const wasmBinary = readFileSync(join(distDir, 'sql-wasm.wasm'))

  SQL = await initSqlJs({ wasmBinary })

  const dbPath = getDbPath()
  let data: Buffer | null = null
  if (existsSync(dbPath)) {
    data = readFileSync(dbPath)
  }
  db = data ? new SQL.Database(data) : new SQL.Database()
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
}

export function getDb(): Database {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

/** 将内存中的数据库落盘（sql.js 是内存数据库，写入后需显式导出） */
export function saveDb(): void {
  if (!db) return
  writeFileSync(getDbPath(), Buffer.from(db.export()))
}

export function closeDb(): void {
  if (db) {
    try {
      saveDb()
    } catch {
      /* 忽略退出时的落盘失败 */
    }
    db.close()
    db = null
  }
}

// ---------- 查询辅助（统一处理 Statement 生命周期） ----------

export function queryAll<T>(d: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = d.prepare(sql)
  try {
    stmt.bind(params)
    const rows: T[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T)
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function queryOne<T>(d: Database, sql: string, params: unknown[] = []): T | undefined {
  const stmt = d.prepare(sql)
  try {
    stmt.bind(params)
    return stmt.step() ? (stmt.getAsObject() as T) : undefined
  } finally {
    stmt.free()
  }
}

export function run(d: Database, sql: string, params: unknown[] = []): void {
  d.run(sql, params)
}

export function lastInsertId(d: Database): number {
  const res = d.exec('SELECT last_insert_rowid() AS id')
  return Number(res[0]?.values[0]?.[0] ?? 0)
}

function migrate(d: Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT '',
      employeeNo TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS projects (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'INITIATED',
      statusOwnerId INTEGER,
      ownerId       INTEGER,
      startDate     TEXT NOT NULL,
      endDate       TEXT NOT NULL,
      progress      INTEGER NOT NULL DEFAULT 0,
      description   TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId    INTEGER NOT NULL,
      name         TEXT NOT NULL,
      stage        TEXT NOT NULL DEFAULT 'REQUIREMENT',
      status       TEXT NOT NULL DEFAULT 'REVIEW',
      statusUserId INTEGER,
      ownerId      INTEGER,
      startDate    TEXT NOT NULL,
      endDate      TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      role   TEXT NOT NULL DEFAULT 'MEMBER',
      UNIQUE(taskId, userId)
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId          INTEGER NOT NULL,
      dependsOnTaskId INTEGER NOT NULL,
      UNIQUE(taskId, dependsOnTaskId)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId      INTEGER NOT NULL,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date        TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project   ON tasks(projectId);
    CREATE INDEX IF NOT EXISTS idx_assign_task     ON assignments(taskId);
    CREATE INDEX IF NOT EXISTS idx_assign_user     ON assignments(userId);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_task  ON bookmarks(taskId);
  `)

  // 兼容旧库：补充 employeeNo 列
  if (!columnExists(d, 'users', 'employeeNo')) {
    d.exec("ALTER TABLE users ADD COLUMN employeeNo TEXT NOT NULL DEFAULT ''")
  }
}

function columnExists(d: Database, table: string, column: string): boolean {
  const res = d.exec(`PRAGMA table_info(${table})`)
  if (res.length === 0) return false
  return res[0].values.some((row) => row[1] === column)
}
