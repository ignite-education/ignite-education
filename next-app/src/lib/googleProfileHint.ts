const STORAGE_KEY = 'ignite_google_profile_hint'

export type GoogleProfileHint = {
  name: string
  email: string
  avatar: string
}

export function saveGoogleProfileHint(user: { user_metadata?: Record<string, string>; email?: string }) {
  try {
    const meta = user.user_metadata ?? {}
    const hint: GoogleProfileHint = {
      name: meta.full_name || meta.name || '',
      email: user.email || meta.email || '',
      avatar: meta.avatar_url || meta.picture || '',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hint))
  } catch {}
}

export function getGoogleProfileHint(): GoogleProfileHint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GoogleProfileHint
  } catch {
    return null
  }
}
