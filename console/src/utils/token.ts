export const TOKEN_KEY = 'auth-token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(val) {
  localStorage.setItem(TOKEN_KEY, val)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}