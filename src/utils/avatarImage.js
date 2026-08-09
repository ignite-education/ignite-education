/**
 * Profile-picture validation, cropping and upload.
 *
 * These were inline in `SettingsModal.jsx` as `resizeProfileImage` + the body of
 * `handleProfilePictureUpload`, which centre-cropped to a square with no say from
 * the user. The crop rect is now chosen in `AvatarCropModal`, so the canvas step
 * takes that rect as an argument; the output contract — a 400px square JPEG at
 * quality 0.85, upserted to one path per user — is deliberately unchanged so
 * existing avatars and newly cropped ones are stored identically.
 */
import { supabase } from '../lib/supabase';

const MAX_OUTPUT_SIZE = 400;
const JPEG_QUALITY = 0.85;
const MIN_BYTES = 50 * 1024;
const MAX_BYTES = 3.5 * 1024 * 1024;

/**
 * Returns an error message for an unusable pick, or null when the file is fine.
 *
 * The type check is a fallback, not the primary defence: the file inputs carry
 * `accept="image/*"`, but accept only filters what the OS dialog offers — a user
 * can switch it to "All Files" and some platforms ignore it outright. Without this
 * a .pdf would reach the cropper and fail there, which reads far worse.
 */
export function validateAvatarFile(file) {
  if (!file.type.startsWith('image/')) return 'Must be an image file';
  if (file.size < MIN_BYTES) return 'Image must be >50KB';
  if (file.size > MAX_BYTES) return 'Image must be <3.5MB';
  return null;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Draws `cropPixels` (react-easy-crop's `croppedAreaPixels`, in natural image
 * coordinates) onto a square canvas and returns it as a JPEG File.
 *
 * The output is capped at MAX_OUTPUT_SIZE but never upscaled — zooming right in
 * on a small image yields a smaller file rather than a blurry 400px one.
 */
export async function cropToJpegFile(imageSrc, cropPixels) {
  const img = await loadImage(imageSrc);
  const outSize = Math.min(Math.round(cropPixels.width), MAX_OUTPUT_SIZE);

  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, outSize, outSize
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  return new File([blob], 'profile.jpg', { type: 'image/jpeg' });
}

/**
 * Turns a thrown error into something actionable on screen.
 *
 * `stage` says which step failed, because the three have completely different
 * causes: canvas work is local, the upload is storage RLS, and the profile write
 * is auth. A bare "please try again" hides all of that.
 */
export function describeAvatarError(stage, err) {
  const message = err?.message || 'unknown error';

  // The raw text is always appended. A canned message on its own is a dead end:
  // "mime type image/jpeg is not supported" (bucket restricts types) and "mime type
  // text/plain;charset=UTF-8 is not supported" (our content type never arrived) read
  // the same when summarised, but need opposite fixes.
  let hint = '';
  if (/row-level security|violates|policy|Unauthorized|403/i.test(message)) {
    hint = 'Permission — the assets bucket needs a policy letting this user write profile_pictures/ (replacing an existing file needs UPDATE, not just INSERT). ';
  } else if (/Bucket not found/i.test(message)) {
    hint = 'The "assets" bucket was not found. ';
  } else if (/exceeded|too large|Payload|413/i.test(message)) {
    hint = 'Storage considers the image too large. ';
  } else if (/mime/i.test(message)) {
    hint = 'Storage rejected the MIME type — check the bucket\'s allowed types against the type named below. ';
  }

  const prefix = stage === 'crop'
    ? 'Could not process the image'
    : stage === 'profile'
      ? 'Uploaded, but saving it to your profile failed'
      : 'Upload failed';

  return `${prefix}. ${hint}[${message}]`;
}

/**
 * Upserts the avatar to one fixed path per user and returns its public URL.
 *
 * The path never varies, so the CDN would keep serving the previous image — the
 * `?t=` query defeats that cache the moment the new URL lands on the profile.
 */
export async function uploadAvatar(file, userId) {
  const filePath = `profile_pictures/${userId}.jpg`;

  // Hand storage-js the File, not an ArrayBuffer. Only a Blob/File takes its
  // FormData path, where the multipart part carries the file's own MIME type; an
  // ArrayBuffer falls through to a hand-set content-type header, which is the
  // fragile route and one more full copy of the image in memory.
  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filePath, file, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}
