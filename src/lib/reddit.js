/**
 * Reddit OAuth and API integration
 * Handles authentication and posting to Reddit
 */

const REDDIT_CLIENT_ID = import.meta.env.VITE_REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = import.meta.env.VITE_REDDIT_CLIENT_SECRET;
const REDDIT_REDIRECT_URI = import.meta.env.VITE_REDDIT_REDIRECT_URI;
const REDDIT_USER_AGENT = import.meta.env.VITE_REDDIT_USER_AGENT || 'Ignite-Learning-Platform/1.0';

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_API_URL = 'https://oauth.reddit.com';

// Storage keys
const ACCESS_TOKEN_KEY = 'reddit_access_token';
const REFRESH_TOKEN_KEY = 'reddit_refresh_token';
const TOKEN_EXPIRY_KEY = 'reddit_token_expiry';

/**
 * Generate a random state string for OAuth security
 */
function generateState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Check if user is authenticated with Reddit
 */
export function isRedditAuthenticated() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return false;

  // Check if token is expired
  return Date.now() < parseInt(expiry);
}

/**
 * Get stored Reddit access token
 */
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Store Reddit tokens
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
 * Clear stored Reddit tokens
 */
export function clearRedditTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Initiate Reddit OAuth flow
 * Opens Reddit authorization page
 */
export function initiateRedditAuth() {
  // Validate required environment variables
  if (!REDDIT_CLIENT_ID || REDDIT_CLIENT_ID === 'undefined') {
    alert('Reddit Client ID is not configured. Please add VITE_REDDIT_CLIENT_ID to your .env file.\n\nSee README.md for setup instructions.');
    console.error('Missing VITE_REDDIT_CLIENT_ID in environment variables');
    return;
  }

  if (!REDDIT_REDIRECT_URI || REDDIT_REDIRECT_URI === 'undefined') {
    alert('Reddit Redirect URI is not configured. Please add VITE_REDDIT_REDIRECT_URI to your .env file.\n\nSee README.md for setup instructions.');
    console.error('Missing VITE_REDDIT_REDIRECT_URI in environment variables');
    return;
  }

  const state = generateState();
  localStorage.setItem('reddit_oauth_state', state);

  const params = new URLSearchParams({
    client_id: REDDIT_CLIENT_ID,
    response_type: 'code',
    state: state,
    redirect_uri: REDDIT_REDIRECT_URI,
    duration: 'permanent', // Request refresh token
    scope: 'submit identity vote read' // Permissions: submit posts, read user identity, vote, read comments
  });

  const authUrl = `${REDDIT_AUTH_URL}?${params.toString()}`;
  console.log('🔗 Redirecting to Reddit OAuth:', authUrl);
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 * Call this when user returns from Reddit authorization
 */
export async function handleRedditCallback(code, state) {
  // Verify state to prevent CSRF
  const storedState = localStorage.getItem('reddit_oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid OAuth state parameter');
  }
  localStorage.removeItem('reddit_oauth_state');

  // Exchange code for access token
  const credentials = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDDIT_REDIRECT_URI
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Reddit OAuth error: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  storeTokens(data.access_token, data.refresh_token, data.expires_in);

  return data;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const credentials = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    clearRedditTokens();
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  storeTokens(data.access_token, data.refresh_token, data.expires_in);

  return data.access_token;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken() {
  if (isRedditAuthenticated()) {
    return getAccessToken();
  }

  // Try to refresh token
  try {
    return await refreshAccessToken();
  } catch (error) {
    // Refresh failed, need to re-authenticate
    throw new Error('Reddit authentication expired. Please authenticate again.');
  }
}

/**
 * Available flair options for different subreddits
 * Maps subreddit name to array of flair options
 */
export const SUBREDDIT_FLAIRS = {
  'cybersecurity': [
    { value: 'Question', label: 'Question' },
    { value: 'Discussion', label: 'Discussion' },
    { value: 'News', label: 'News' },
    { value: 'Career', label: 'Career' },
    { value: 'Education', label: 'Education' }
  ],
  'productmanagement': [
    { value: 'Discussion', label: 'Discussion' },
    { value: 'Question', label: 'Question' },
    { value: 'Career', label: 'Career' },
    { value: 'Resources', label: 'Resources' }
  ],
  'ProductManagement': [
    { value: 'Discussion', label: 'Discussion' },
    { value: 'Question', label: 'Question' },
    { value: 'Career', label: 'Career' }
  ],
  'ProductManager': [
    { value: 'Discussion', label: 'Discussion' },
    { value: 'Question', label: 'Question' }
  ],
  'cscareerquestions': [
    { value: 'Student', label: 'Student' },
    { value: 'Experienced', label: 'Experienced' },
    { value: 'Big N Discussion', label: 'Big N Discussion' }
  ],
  'learnprogramming': [
    { value: 'Question', label: 'Question' },
    { value: 'Resource', label: 'Resource' },
    { value: 'Discussion', label: 'Discussion' }
  ]
};

/**
 * Post to Reddit
 * @param {string} subreddit - Subreddit name (without r/)
 * @param {string} title - Post title
 * @param {string} text - Post content (for text posts)
 * @param {string} flairText - Optional flair text to apply to the post
 * @returns {Promise<Object>} Post data including URL
 */
export async function postToReddit(subreddit, title, text, flairText = null) {
  const accessToken = await getValidAccessToken();

  // Note: Context should be added by the caller (e.g., ProgressHub adds course-specific context)

  const params = {
    sr: subreddit,
    kind: 'self', // Text post
    title: title,
    text: text, // Use the text as-is (context already added by caller)
    api_type: 'json'
  };

  // Add flair if provided
  if (flairText) {
    params.flair_text = flairText;
    console.log(`📌 Posting to r/${subreddit} with flair: "${flairText}"`);
  } else {
    console.log(`ℹ️ Posting to r/${subreddit} without flair (subreddit may reject if flair is required)`);
  }

  const response = await fetch(`${REDDIT_API_URL}/api/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT
    },
    body: new URLSearchParams(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post to Reddit: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Check for Reddit API errors
  if (data.json?.errors?.length > 0) {
    const errorMessage = data.json.errors[0][1];

    // Provide helpful message for flair-related errors
    if (errorMessage.includes('post flair') || errorMessage.includes('flair')) {
      throw new Error(`r/${subreddit} requires post flair. Your post was saved to the Community Forum but could not be shared to Reddit. To share to Reddit, please post directly on r/${subreddit}.`);
    }

    throw new Error(`Reddit API error: ${errorMessage}`);
  }

  return {
    success: true,
    url: `https://reddit.com${data.json.data.url}`,
    id: data.json.data.id,
    name: data.json.data.name
  };
}

/**
 * Get current Reddit username
 */
export async function getRedditUsername() {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${REDDIT_API_URL}/api/v1/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': REDDIT_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get Reddit user info');
  }

  const data = await response.json();
  return data.name;
}

/**
 * Vote on a Reddit post or comment
 * @param {string} thingId - Full ID of the thing to vote on (e.g., 't3_abc123' for posts, 't1_def456' for comments)
 * @param {number} direction - Vote direction: 1 (upvote), -1 (downvote), 0 (remove vote)
 * @returns {Promise<void>}
 */
export async function voteOnReddit(thingId, direction) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${REDDIT_API_URL}/api/vote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT
    },
    body: new URLSearchParams({
      id: thingId,
      dir: direction.toString()
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to vote on Reddit: ${response.status} ${error}`);
  }

  return { success: true };
}

/**
 * Comment on a Reddit post
 * @param {string} thingId - Full ID of the thing to comment on (e.g., 't3_abc123' for posts)
 * @param {string} text - Comment text (supports markdown)
 * @returns {Promise<Object>} Comment data
 */
export async function commentOnReddit(thingId, text) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${REDDIT_API_URL}/api/comment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT
    },
    body: new URLSearchParams({
      thing_id: thingId,
      text: text,
      api_type: 'json'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to comment on Reddit: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Check for Reddit API errors
  if (data.json?.errors?.length > 0) {
    throw new Error(`Reddit API error: ${data.json.errors[0][1]}`);
  }

  return {
    success: true,
    comment: data.json.data.things[0],
    id: data.json.data.things[0].data.id,
    name: data.json.data.things[0].data.name
  };
}

/**
 * Get comments for a Reddit post
 * @param {string} subreddit - Subreddit name (without r/)
 * @param {string} postId - Post ID (without prefix, e.g., 'abc123' not 't3_abc123')
 * @returns {Promise<Array>} Array of comments
 */
export async function getRedditComments(subreddit, postId) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${REDDIT_API_URL}/r/${subreddit}/comments/${postId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': REDDIT_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Reddit comments (${response.status})`);
  }

  const data = await response.json();

  // Reddit returns [post_data, comments_data]
  const commentsData = data[1]?.data?.children || [];

  return commentsData.map(child => ({
    id: child.data.id,
    name: child.data.name,
    author: child.data.author,
    body: child.data.body,
    created_utc: child.data.created_utc,
    score: child.data.score,
    replies: child.data.replies
  }));
}

/**
 * Get user's vote status on a post
 * This information is included when fetching posts with authentication
 * @param {string} postFullname - Full name of the post (e.g., 't3_abc123')
 * @returns {Promise<number|null>} Vote direction: 1 (upvoted), -1 (downvoted), null (no vote)
 */
export async function getUserVote(postFullname) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${REDDIT_API_URL}/api/info?id=${postFullname}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': REDDIT_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get post info');
  }

  const data = await response.json();

  if (data.data?.children?.length > 0) {
    const post = data.data.children[0].data;
    return post.likes; // true = upvoted, false = downvoted, null = no vote
  }

  return null;
}
