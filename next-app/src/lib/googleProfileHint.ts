const STORAGE_KEY = 'ignite_google_hint'

export interface GoogleProfileHint {
  name: string
  email: string
  avatar: string
}

export function saveGoogleProfileHint(user: { user_metadata?: Record<string, string>; email?: string }): void {
  try {
    const meta = user.user_metadata
    if (!meta) return

    const name = meta.full_name?.split(' ')[0]
      || meta.name?.split(' ')[0]
      || meta.first_name
      || user.email?.split('@')[0]

    const email = meta.email || user.email
    const avatar = meta.avatar_url || meta.picture

    if (name && email) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email, avatar: avatar || '' }))
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
}

export function getGoogleProfileHint(): GoogleProfileHint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.name && parsed.email) return parsed
    return null
  } catch {
    return null
  }
}

export function clearGoogleProfileHint(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
