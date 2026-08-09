/**
 * Initials for the avatar fallback tile shown when a user has no usable
 * profile picture.
 *
 * `firstName`/`lastName` come from `useAuth()`, which already normalises them
 * out of `user_metadata` (either the explicit `first_name`/`last_name` pair or
 * a split of `full_name`) and returns `null` when absent — so a user who only
 * ever gave one name yields a single initial rather than a stray character.
 *
 * Falls back to 'U' so the tile is never blank.
 */
export function getInitials(firstName, lastName) {
  const initials = [firstName, lastName]
    .map((name) => name?.trim()?.[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return initials || 'U';
}
