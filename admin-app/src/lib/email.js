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
 * Send course welcome email when user enrolls in a course
 * @param {string} userId - User ID
 * @param {string} courseName - Name of the course they enrolled in
 */
export function sendCourseWelcomeEmail(userId, courseName) {
  return sendMilestoneEmail('welcome', userId, { courseName });
}

/**
 * Send first lesson completion email
 * @param {string} userId - User ID
 * @param {string} lessonName - Name of the completed lesson
 * @param {string} courseName - Name of the course
 */
export function sendFirstLessonEmail(userId, lessonName, courseName) {
  return sendMilestoneEmail('first_lesson', userId, { lessonName, courseName });
}

/**
 * Send subscription confirmation email
 * @param {string} userId - User ID
 */
export function sendSubscriptionConfirmEmail(userId) {
  return sendMilestoneEmail('subscription_confirm', userId);
}

/**
 * Send subscription cancelled email
 * @param {string} userId - User ID
 */
export function sendSubscriptionCancelledEmail(userId) {
  return sendMilestoneEmail('subscription_cancelled', userId);
}

/**
 * Send inactivity reminder email
 * @param {string} userId - User ID
 * @param {number} daysSinceLogin - Number of days since last login
 * @param {string} courseName - Name of their enrolled course
 */
export function sendInactivityReminderEmail(userId, daysSinceLogin, courseName) {
  return sendMilestoneEmail('inactivity_reminder', userId, { daysSinceLogin, courseName });
}

// Legacy alias for backwards compatibility
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

// ============================================
// RESEND AUDIENCE MANAGEMENT
// ============================================

/**
 * Add a contact to a Resend audience
 * @param {object} contact - Contact details
 * @param {string} contact.email - Contact email
 * @param {string} contact.firstName - First name
 * @param {string} contact.lastName - Last name
 * @param {string} audienceId - Resend audience ID
 * @returns {Promise<{success: boolean, contactId?: string, error?: string}>}
 */
export async function addContactToAudience(contact, audienceId) {
  try {
    console.log(`📋 Adding contact ${contact.email} to audience ${audienceId}`);

    const response = await fetch(`${API_URL}/api/resend/add-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        audienceId
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add contact to audience');
    }

    console.log(`✅ Contact added to audience:`, result.contactId);
    return { success: true, contactId: result.contactId };

  } catch (error) {
    console.error(`❌ Error adding contact to audience:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync a user to multiple audiences at once
 * @param {object} contact - Contact details
 * @param {string} contact.email - Contact email
 * @param {string} contact.firstName - First name
 * @param {string} contact.lastName - Last name
 * @param {string[]} audienceIds - Array of Resend audience IDs
 * @returns {Promise<{success: boolean, results?: object[], error?: string}>}
 */
export async function syncContactToAudiences(contact, audienceIds) {
  try {
    console.log(`📋 Syncing contact ${contact.email} to ${audienceIds.length} audiences`);

    const response = await fetch(`${API_URL}/api/resend/sync-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        audienceIds
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to sync contact to audiences');
    }

    console.log(`✅ Contact synced to audiences`);
    return { success: true, results: result.results };

  } catch (error) {
    console.error(`❌ Error syncing contact to audiences:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update contact properties in Resend
 * @param {string} audienceId - Resend audience ID
 * @param {string} contactId - Resend contact ID
 * @param {object} properties - Properties to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateContactProperties(audienceId, contactId, properties) {
  try {
    console.log(`📝 Updating contact ${contactId} properties`);

    const response = await fetch(`${API_URL}/api/resend/update-contact`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audienceId,
        contactId,
        properties
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update contact properties');
    }

    console.log(`✅ Contact properties updated`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error updating contact properties:`, error);
    return { success: false, error: error.message };
  }
}

// Audience ID constants - Mutually exclusive segmented audiences
export const RESEND_AUDIENCES = {
  GENERAL: import.meta.env.VITE_RESEND_AUDIENCE_GENERAL || '',
  PM_FREE: import.meta.env.VITE_RESEND_AUDIENCE_PM_FREE || '',
  PM_PAID: import.meta.env.VITE_RESEND_AUDIENCE_PM_PAID || '',
};

/**
 * Remove a contact from a Resend audience
 * @param {string} email - Contact email
 * @param {string} audienceId - Resend audience ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeContactFromAudience(email, audienceId) {
  try {
    if (!audienceId) {
      console.log('📋 No audience ID provided, skipping removal');
      return { success: true };
    }

    console.log(`📋 Removing contact ${email} from audience ${audienceId}`);

    const response = await fetch(`${API_URL}/api/resend/remove-contact`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, audienceId })
    });

    const result = await response.json();

    if (!response.ok) {
      // Don't throw on "not found" - contact may not be in audience
      if (result.error?.includes('not found') || result.error?.includes('does not exist')) {
        console.log(`📋 Contact ${email} not in audience (already removed or never added)`);
        return { success: true };
      }
      throw new Error(result.error || 'Failed to remove contact from audience');
    }

    console.log(`✅ Contact removed from audience`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error removing contact from audience:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Move a contact from one audience to another (atomic operation)
 * @param {object} contact - Contact details (email, firstName, lastName)
 * @param {string|null} fromAudienceId - Audience to remove from (null to skip removal)
 * @param {string} toAudienceId - Audience to add to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function moveContactBetweenAudiences(contact, fromAudienceId, toAudienceId) {
  try {
    console.log(`📋 Moving ${contact.email} from audience ${fromAudienceId || 'none'} to ${toAudienceId}`);

    // Remove from old audience first (if specified)
    if (fromAudienceId) {
      await removeContactFromAudience(contact.email, fromAudienceId);
    }

    // Add to new audience
    const result = await addContactToAudience(contact, toAudienceId);

    console.log(`✅ Contact moved successfully`);
    return result;
  } catch (error) {
    console.error('❌ Error moving contact between audiences:', error);
    return { success: false, error: error.message };
  }
}
