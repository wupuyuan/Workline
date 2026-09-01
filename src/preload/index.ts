import { contextBridge, ipcRenderer } from 'electron'
import type { WorklineApi } from '@shared/types'

const api: WorklineApi = {
  getData: () => ipcRenderer.invoke('data:get'),
  getDebugInfo: () => ipcRenderer.invoke('debug:info'),
  resetAndSeed: () => ipcRenderer.invoke('debug:reset'),

  createUser: (input) => ipcRenderer.invoke('user:create', input),
  updateUser: (id, input) => ipcRenderer.invoke('user:update', id, input),
  deleteUser: (id) => ipcRenderer.invoke('user:delete', id),

  createProject: (input) => ipcRenderer.invoke('project:create', input),
  updateProject: (id, input) => ipcRenderer.invoke('project:update', id, input),
  deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
  advanceProject: (id, toStatus, ownerId) =>
    ipcRenderer.invoke('project:advance', id, toStatus, ownerId),

  createTask: (input) => ipcRenderer.invoke('task:create', input),
  updateTask: (id, input) => ipcRenderer.invoke('task:update', id, input),
  advanceTask: (id, toStatus, statusUserId) =>
    ipcRenderer.invoke('task:advance', id, toStatus, statusUserId),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),

  setAssignment: (taskId, userId, role) => ipcRenderer.invoke('assign:set', taskId, userId, role),
  removeAssignment: (taskId, userId) => ipcRenderer.invoke('assign:remove', taskId, userId),

  addDependency: (taskId, dependsOnTaskId) =>
    ipcRenderer.invoke('dep:add', taskId, dependsOnTaskId),
  removeDependency: (id) => ipcRenderer.invoke('dep:remove', id),

  addBookmark: (input) => ipcRenderer.invoke('bookmark:add', input),
  updateBookmark: (id, input) => ipcRenderer.invoke('bookmark:update', id, input),
  deleteBookmark: (id) => ipcRenderer.invoke('bookmark:delete', id),

  openDevTools: () => ipcRenderer.invoke('debug:open-devtools')
}

contextBridge.exposeInMainWorld('api', api)
