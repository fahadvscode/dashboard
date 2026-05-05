'use client'

const SESSION_KEY = 'dashboard_authenticated'
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Password must be set via NEXT_PUBLIC_DASHBOARD_PASSWORD (Vercel / .env.local).
// It is bundled into the client — use a strong value and treat it as a shared gate, not a vault.
const getPassword = () => process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD?.trim() ?? ''

export function setAuthenticated() {
  const expiry = Date.now() + SESSION_EXPIRY
  localStorage.setItem(SESSION_KEY, 'true')
  localStorage.setItem('dashboard_session_expiry', expiry.toString())
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  const authenticated = localStorage.getItem(SESSION_KEY)
  const expiry = localStorage.getItem('dashboard_session_expiry')
  
  if (!authenticated || !expiry) return false
  
  // Check if session expired
  if (Date.now() > parseInt(expiry)) {
    logout()
    return false
  }
  
  return authenticated === 'true'
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('dashboard_session_expiry')
}

export function checkPassword(password: string): boolean {
  const DASHBOARD_PASSWORD = getPassword()
  if (!DASHBOARD_PASSWORD) return false
  return password.trim() === DASHBOARD_PASSWORD
}

