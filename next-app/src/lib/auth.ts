import type { SupabaseClient, User } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'
const RESEND_AUDIENCE_GENERAL = process.env.NEXT_PUBLIC_RESEND_AUDIENCE_GENERAL || ''

/**
 * Create a user record in public.users table after sign-up.
 * Ignores duplicate key errors (user may already exist from a DB trigger).
 */
export async function createUserRecord(
  supabase: SupabaseClient,
  user: User,
  firstName: string,
  lastName: string
) {
  const { error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      onboarding_completed: false,
      role: 'student',
    })

  if (error && !error.message.includes('duplicate key')) {
    console.error('Error creating user record:', error)
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
