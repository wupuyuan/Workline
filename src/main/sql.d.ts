// sql.js 的最小类型声明（本仓库不安装 @types/sql.js，按需声明所用到的 API 子集）
declare module 'sql.js' {
  export type BindParams = unknown[] | Record<string, unknown>

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export interface Statement {
    bind(params?: BindParams): boolean
    step(): boolean
    /** 返回当前行的值数组 */
    get(params?: BindParams): any
    /** 返回当前行（step 之后）的对象形式，键为列名 */
    getAsObject(): any
    run(params?: BindParams): Database
    reset(): void
    free(): boolean
    getColumnNames(): string[]
  }

  export interface Database {
    run(sql: string, params?: BindParams): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayBuffer | Uint8Array
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayBuffer | Uint8Array) => Database
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
