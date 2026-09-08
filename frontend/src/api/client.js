import { useAuthStore } from '../store/authStore'
import { mockRequest, mockEnabled } from './mockBackend'

function buildConfig(url, config) {
  config = config || {}
  config.headers = config.headers || {}
  const token = useAuthStore.getState().token
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  config.url = url
  return config
}

function request(method, url, body, config) {
  config = buildConfig(url, config)
  try {
    return Promise.resolve(mockRequest(method, url, body, config))
  } catch (err) {
    if (err && err.response && err.response.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
}

const api = {
  get: (url, config) => request('get', url, null, config),
  post: (url, body, config) => request('post', url, body, config),
  patch: (url, body, config) => request('patch', url, body, config),
  put: (url, body, config) => request('put', url, body, config),
  delete: (url, config) => request('delete', url, null, config),
}

export default api