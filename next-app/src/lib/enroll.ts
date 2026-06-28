import type { SupabaseClient, User } from '@supabase/supabase-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'
const RESEND_AUDIENCE_GENERAL = process.env.NEXT_PUBLIC_RESEND_AUDIENCE_GENERAL || ''
const RESEND_AUDIENCE_PM_FREE = process.env.NEXT_PUBLIC_RESEND_AUDIENCE_PM_FREE || ''

// Map course slugs to their Resend audience IDs
const COURSE_TO_AUDIENCE: Record<string, string> = {
  'product-manager': RESEND_AUDIENCE_PM_FREE,
}

// Save a course to the user's saved_courses (idempotent)
export async function saveCourseForUser(supabase: SupabaseClient, userId: string, courseSlug: string) {
  const { data: existing } = await supabase
    .from('saved_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseSlug)
    .maybeSingle()

  if (!existing) {
    await supabase
      .from('saved_courses')
      .insert({ user_id: userId, course_id: courseSlug })
  }
}

// Register interest in a coming-soon course (idempotent; ignores duplicate rows)
export async function registerInterestForUser(supabase: SupabaseClient, userId: string, courseSlug: string) {
  const { error } = await supabase
    .from('course_requests')
    .insert({ user_id: userId, course_name: courseSlug, status: 'upcoming' })
  if (error && error.code !== '23505') {
    console.error('[enroll] Failed to register interest:', error)
  }
}

/**
 * Enroll a user in a course: save + set enrolled_course + welcome email + audience sync.
 * Works with either the browser or the server Supabase client.
 * Silently no-ops (skips email/audience sync) if the user is already enrolled in this course.
 * Does NOT touch any React state.
 */
export async function enrollUserInCourse(opts: {
  supabase: SupabaseClient
  userId: string
  authUser: User
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}): Promise<void> {
  const { supabase, userId, authUser, courseSlug, courseTitle, isComingSoon } = opts

  // Always save to saved_courses
  await saveCourseForUser(supabase, userId, courseSlug)

  // Auto-register interest for coming-soon courses
  if (isComingSoon) {
    await registerInterestForUser(supabase, userId, courseSlug)
  }

  // Only set enrolled_course for live courses
  if (!isComingSoon) {
    // Ensure user record exists before updating
    const { data: existing } = await supabase
      .from('users')
      .select('id, enrolled_course')
      .eq('id', userId)
      .maybeSingle()

    // Already enrolled in this course — skip email & audience sync
    if (existing?.enrolled_course === courseSlug) {
      return
    }

    if (!existing) {
      const metadata = authUser.user_metadata || {}
      await supabase.from('users').insert({
        id: userId,
        first_name: metadata.first_name || metadata.given_name || metadata.full_name?.split(' ')[0] || '',
        last_name: metadata.last_name || metadata.family_name || metadata.full_name?.split(' ').slice(1).join(' ') || '',
        enrolled_course: courseSlug,
        onboarding_completed: true,
        role: 'student',
      })
    } else {
      await supabase
        .from('users')
        .update({
          enrolled_course: courseSlug,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    // Send welcome email (non-blocking)
    fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'welcome',
        userId,
        data: { courseName: courseTitle },
      }),
    }).catch(err => console.error('[enroll] Welcome email failed:', err))

    // Audience sync: move from General → course-specific (non-blocking)
    const courseAudienceId = COURSE_TO_AUDIENCE[courseSlug]
    if (courseAudienceId && authUser.email) {
      const contactInfo = {
        email: authUser.email,
        firstName: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ')[1] || '',
      }

      // Remove from General audience
      if (RESEND_AUDIENCE_GENERAL) {
        fetch(`${API_URL}/api/resend/remove-contact`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: contactInfo.email, audienceId: RESEND_AUDIENCE_GENERAL }),
        }).catch(err => console.error('[enroll] Remove from General failed:', err))
      }

      // Add to course-specific audience
      fetch(`${API_URL}/api/resend/add-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactInfo, audienceId: courseAudienceId }),
      }).catch(err => console.error('[enroll] Add to course audience failed:', err))
    }
  }
}
