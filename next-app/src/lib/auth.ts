import type { SupabaseClient, User } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'
const RESEND_AUDIENCE_GENERAL = process.env.NEXT_PUBLIC_RESEND_AUDIENCE_GENERAL || ''

/**
 * Resolve the best avatar URL from a user's auth metadata.
 * Priority matches the trigger + AuthContext: custom upload > provider avatar > OIDC picture.
 */
export function resolveAvatarUrl(user: User): string | null {
  const m = user.user_metadata || {}
  return m.custom_avatar_url || m.avatar_url || m.picture || null
}

/**
 * Create a user record in public.users table after sign-up.
 * Ignores duplicate key errors (user may already exist from a DB trigger).
 * Also refreshes avatar_url (used by the public profile page, which reads via
 * the anon client and cannot see auth.users metadata) — never the username,
 * which is generated once by the trigger.
 */
export async function createUserRecord(
  supabase: SupabaseClient,
  user: User,
  firstName: string,
  lastName: string,
  country?: string | null
) {
  const avatarUrl = resolveAvatarUrl(user)

  const { error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      onboarding_completed: false,
      role: 'student',
      ...(country ? { country } : {}),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })

  if (error && !error.message.includes('duplicate key')) {
    console.error('Error creating user record:', error)
  }

  // For existing rows (created by the trigger), keep avatar_url fresh — but
  // only this column, so we never reset onboarding_completed/role on login.
  if (avatarUrl) {
    await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id)
  }
}

/**
 * Add a new user to the Resend "General" audience via the backend API.
 */
export async function addToResendAudience(
  email: string,
  firstName: string,
  lastName: string
) {
  if (!RESEND_AUDIENCE_GENERAL) return

  try {
    await fetch(`${API_URL}/api/resend/add-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        audienceId: RESEND_AUDIENCE_GENERAL,
      }),
    })
  } catch (err) {
    console.error('Failed to add user to Resend General audience:', err)
  }
}
