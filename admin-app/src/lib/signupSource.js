/**
 * Human labels for users.signup_source.
 *
 * The values are written by the public site — see
 * next-app/src/lib/signupSource.ts for what each entry point sends and
 * migrations/add_signup_source.sql for the write-once rule. Keep this list in
 * step with that one; an unknown value still renders (as itself) rather than
 * vanishing.
 */
export const SIGNUP_SOURCE_LABELS = {
  jobs: 'Jobs board',
  course_page: 'Course page',
  course_request: 'Course request',
  profile: 'Public profile',
  prompts: 'Prompts',
  sign_in_page: 'Sign-in page',
  app: 'In-app',
};

/** The filter's "no value" bucket: accounts from before tracking existed. */
export const UNKNOWN_SOURCE = 'unknown';

export const signupSourceLabel = (value) =>
  value ? (SIGNUP_SOURCE_LABELS[value] || value) : 'Unknown';
