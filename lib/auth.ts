'use client'

const SESSION_KEY = 'dashboard_authenticated'
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Get password from environment or use default (change this!)
// Note: In client-side, NEXT_PUBLIC_ vars are available at build time
const DEFAULT_PASSWORD = 'admin123'

const getPassword = () => {
  // Environment variable is available at build time for NEXT_PUBLIC_ vars
  const envPassword = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD
  // Trim any whitespace that might have been added
  return envPassword ? envPassword.trim() : DEFAULT_PASSWORD
}

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
  // Trim input and compare (case-sensitive)
  const trimmedInput = password.trim()
  return trimmedInput === DASHBOARD_PASSWORD
}

