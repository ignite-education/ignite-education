/**
 * Email utility functions for Ignite
 * Uses Resend via backend API to send transactional emails
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

/**
 * Send a milestone email to a user
 * @param {string} type - Email type: 'welcome', 'module_complete', 'course_complete'
 * @param {string} userId - User ID from Supabase auth
 * @param {object} data - Additional data for the email (moduleName, courseName, etc.)
 * @returns {Promise<{success: boolean, emailId?: string, error?: string}>}
 */
export async function sendMilestoneEmail(type, userId, data = {}) {
  try {
    console.log(`📧 Triggering ${type} email for user ${userId}`);

    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        userId,
        data
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log(`✅ Email sent successfully:`, result.emailId);
    return { success: true, emailId: result.emailId };

  } catch (error) {
    console.error(`❌ Error sending ${type} email:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new user
 * @param {string} userId - User ID
 */
export function sendWelcomeEmail(userId) {
  return sendMilestoneEmail('welcome', userId);
}

/**
 * Send module completion email
 * @param {string} userId - User ID
 * @param {string} moduleName - Name of completed module
 * @param {string} courseName - Name of the course
 */
export function sendModuleCompleteEmail(userId, moduleName, courseName) {
  return sendMilestoneEmail('module_complete', userId, { moduleName, courseName });
}

/**
 * Send course completion email
 * @param {string} userId - User ID
 * @param {string} courseName - Name of completed course
 */
export function sendCourseCompleteEmail(userId, courseName) {
  return sendMilestoneEmail('course_complete', userId, { courseName });
}
