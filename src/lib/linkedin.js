/**
 * LinkedIn OAuth and API integration
 * Handles authentication and fetching posts from LinkedIn
 */

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

// Storage keys
const ACCESS_TOKEN_KEY = 'linkedin_access_token';
const REFRESH_TOKEN_KEY = 'linkedin_refresh_token';
const TOKEN_EXPIRY_KEY = 'linkedin_token_expiry';

/**
 * Generate a random state string for OAuth security
 */
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Check if user is authenticated with LinkedIn
 */
export function isLinkedInAuthenticated() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return false;

  // Check if token is expired
  return Date.now() < parseInt(expiry);
}

/**
 * Get stored LinkedIn access token
 */
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Store LinkedIn tokens
 */
function storeTokens(accessToken, refreshToken, expiresIn) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  // Store expiry time (current time + expires_in seconds - 5 min buffer)
  const expiryTime = Date.now() + ((expiresIn - 300) * 1000);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Clear stored LinkedIn tokens
 */
export function clearLinkedInTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Initiate LinkedIn OAuth flow
 * Opens LinkedIn authorization page
 */
export function initiateLinkedInAuth() {
  // Validate required environment variables
  if (!LINKEDIN_CLIENT_ID || LINKEDIN_CLIENT_ID === 'undefined') {
    alert('LinkedIn Client ID is not configured. Please add VITE_LINKEDIN_CLIENT_ID to your .env file.');
    console.error('Missing VITE_LINKEDIN_CLIENT_ID in environment variables');
    return;
  }

  if (!LINKEDIN_REDIRECT_URI || LINKEDIN_REDIRECT_URI === 'undefined') {
    alert('LinkedIn Redirect URI is not configured. Please add VITE_LINKEDIN_REDIRECT_URI to your .env file.');
    console.error('Missing VITE_LINKEDIN_REDIRECT_URI in environment variables');
    return;
  }

  const state = generateState();
  localStorage.setItem('linkedin_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state: state,
    scope: 'r_organization_social r_basicprofile' // Permissions: read org posts, basic profile
  });

  const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  console.log('🔗 Redirecting to LinkedIn OAuth:', authUrl);
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 * Call this when user returns from LinkedIn authorization
 */
export async function handleLinkedInCallback(code, state) {
  // Verify state to prevent CSRF
  const storedState = localStorage.getItem('linkedin_oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid OAuth state parameter');
  }
  localStorage.removeItem('linkedin_oauth_state');

  // Exchange code for access token
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`LinkedIn OAuth error: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  storeTokens(data.access_token, data.refresh_token, data.expires_in);

  return data;
}

/**
 * Get valid access token
 */
async function getValidAccessToken() {
  if (isLinkedInAuthenticated()) {
    return getAccessToken();
  }

  throw new Error('LinkedIn authentication expired. Please authenticate again.');
}

/**
 * Fetch organization posts from LinkedIn
 * @param {string} orgId - LinkedIn organization ID (e.g., '104616735' for Ignite)
 * @param {number} count - Number of posts to fetch (default: 5)
 * @returns {Promise<Array>} Array of posts
 */
export async function getOrganizationPosts(orgId = '104616735', count = 5) {
  try {
    const accessToken = await getValidAccessToken();

    const response = await fetch(
      `${LINKEDIN_API_URL}/organizations/${orgId}/shares?q=owners&count=${count}&sortBy=LAST_MODIFIED`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch LinkedIn posts: ${response.status}`);
    }

    const data = await response.json();

    // Transform LinkedIn API response to our format
    const posts = (data.elements || []).map(post => ({
      id: post.id,
      text: post.text?.text || '',
      created: post.created?.time || Date.now(),
      author: post.owner || '',
      likes: post.totalSocialActivityCounts?.numLikes || 0,
      comments: post.totalSocialActivityCounts?.numComments || 0,
      shares: post.totalSocialActivityCounts?.numShares || 0
    }));

    return posts;
  } catch (error) {
    console.error('Error fetching LinkedIn posts:', error);
    // Return mock data if not authenticated or error occurs
    return getMockLinkedInPosts();
  }
}

/**
 * Get mock LinkedIn posts (fallback when not authenticated)
 */
function getMockLinkedInPosts() {
  return [
    {
      id: '7366907418041090049',
      text: 'Want to get into Product Management? Every week, we round up the best opportunities.\n\nGraduate Product Manager at Evernote (UK/Italy)\nProgramme Manager Graduate at TikTok (UK)\nProduct Manager Intern at TikTok (UK)\nProduct Owner (Graduate) at Revolut (UK)\nAssistant Product Marketing Manager at Huel (UK)\nProduct Manager (Subscriptions) at Spotify (UK/Sweden)\nProduct Manager (Developer Marketplace) at Vodafone (UK)\nProduct Manager at Selfridges (UK)\n\nKnow of any others? Share them in the comments!\n\n#ProductManagement #EntryLevelJobs',
      created: new Date('2025-01-13').getTime(), // Date from LinkedIn post
      author: 'Ignite',
      likes: 1,
      comments: 0,
      shares: 0
    },
    {
      id: '2',
      text: 'Join thousands of learners upskilling with Ignite. Our courses are completely free and designed for everyone. 💡',
      created: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      author: 'Ignite Education',
      likes: 63,
      comments: 15,
      shares: 21
    },
    {
      id: '3',
      text: 'New module just dropped in our Cybersecurity course! Dive into threat detection and incident response. 🔒',
      created: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      author: 'Ignite Education',
      likes: 89,
      comments: 23,
      shares: 34
    }
  ];
}
