import { useState, useEffect, useMemo, useCallback } from 'react';
import Cropper from 'react-easy-crop';
// Required: `.reactEasyCrop_Image { max-width: unset }` in here is what stops
// Tailwind's preflight `img { max-width: 100% }` from squashing the cropper media.
import 'react-easy-crop/react-easy-crop.css';

import { useAuth } from '../../contexts/AuthContext';
import { cropToJpegFile, uploadAvatar, describeAvatarError } from '../../utils/avatarImage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Square crop/reposition editor for a newly picked profile picture.
 *
 * Owns the whole commit path — crop, upload, profile update — so both callers
 * (the hub avatar and the Settings "Edit" button) only have to hand over a File
 * and re-render. `onSaved` fires once the new URL is on the profile.
 *
 * Sits above SettingsModal's z-index 9999, since it opens on top of it.
 */
const AvatarCropModal = ({ file, onCancel, onSaved }) => {
  const { user: authUser, updateProfile } = useAuth();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // An object URL, not a data URL — no base64 inflation for a 3.5MB pick.
  const imageSrc = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape' && !saving) onCancel?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, saving]);

  const onCropComplete = useCallback((_, areaPixels) => setCroppedAreaPixels(areaPixels), []);

  // stopPropagation matters: this can open inside SettingsModal, whose own overlay
  // closes on any click that reaches it. Without it, dismissing the crop would shut
  // Settings as well.
  const handleBackdropClick = (e) => {
    e.stopPropagation();
    if (!saving) onCancel?.();
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    setError(null);

    // Tracks which step threw, so the message can name the real cause.
    let stage = 'crop';
    try {
      // TEMP DIAGNOSTICS — remove once the upload path is confirmed working.
      console.log('[Avatar] 1. crop rect', croppedAreaPixels, 'user', authUser?.id);

      const cropped = await cropToJpegFile(imageSrc, croppedAreaPixels);
      console.log('[Avatar] 2. cropped file', { size: cropped.size, type: cropped.type, name: cropped.name });

      stage = 'upload';
      const publicUrl = await uploadAvatar(cropped, authUser.id);
      console.log('[Avatar] 3. uploaded, public URL:', publicUrl);

      // Is the object actually readable? This is the difference between "the
      // upload lied" and "the browser can't fetch what we stored".
      try {
        const probe = await fetch(publicUrl, { method: 'GET', cache: 'no-store' });
        console.log('[Avatar] 4. GET probe:', probe.status, probe.headers.get('content-type'), probe.headers.get('content-length'));
      } catch (probeErr) {
        console.warn('[Avatar] 4. GET probe threw:', probeErr);
      }

      stage = 'profile';
      const result = await updateProfile({ custom_avatar_url: publicUrl });
      console.log('[Avatar] 5. metadata after update:', result?.user?.user_metadata?.custom_avatar_url);

      // Leave `saving` true — onSaved unmounts us, and dropping it first would
      // flash the buttons back to their idle state on the way out.
      onSaved?.();
    } catch (err) {
      console.error(`Profile picture failed at the ${stage} step:`, err);
      setError(describeAvatarError(stage, err));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center animate-fadeIn"
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 10000,
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Crop your picture"
    >
      <div
        className="relative bg-white flex flex-col"
        style={{
          width: 'min(420px, 92vw)',
          padding: 'clamp(1.25rem, 5vw, 1.75rem)',
          borderRadius: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-black"
          style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '0.75rem' }}
        >
          Position your picture
        </h3>

        {/* Explicit height: the cropper fills its container absolutely, so it
            collapses to nothing without one. */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 'min(300px, 62vw)',
            background: '#000',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <p
          className="text-black"
          style={{ fontSize: '0.9rem', fontWeight: 300, lineHeight: '1.375', marginTop: '0.75rem' }}
        >
          Drag to reposition, and zoom to fill the square.
        </p>

        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          disabled={saving}
          className="w-full cursor-pointer"
          style={{ accentColor: '#EF0B72', marginTop: '0.5rem' }}
        />

        {error && (
          <p className="text-red-500" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
        )}

        <div className="flex items-center justify-end gap-3" style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={saving}
            className="text-black transition disabled:opacity-50 cursor-pointer"
            style={{
              borderRadius: '0.3rem',
              backgroundColor: 'white',
              width: '100px',
              height: '35px',
              fontSize: '0.9rem',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              boxShadow: '0 0 6px rgba(103,103,103,0.35)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="text-white transition disabled:opacity-50 cursor-pointer"
            style={{
              borderRadius: '0.3rem',
              backgroundColor: '#EF0B72',
              width: '100px',
              height: '35px',
              fontSize: '0.9rem',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              border: 'none',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
