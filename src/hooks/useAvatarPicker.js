import { useRef, useState } from 'react';
import { validateAvatarFile } from '../utils/avatarImage';

/**
 * Hidden-file-input plumbing for choosing a profile picture, shared by the hub
 * avatar and the Settings "Edit" button.
 *
 * Validation happens here rather than in the crop modal so an unusable pick never
 * gets as far as opening the editor. A valid pick lands in `pendingFile`, which is
 * the caller's cue to render `AvatarCropModal`.
 */
export default function useAvatarPicker() {
  const inputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    // Clear the input before anything else: without this, re-picking the same
    // file fires no change event, so a cancelled crop could not be retried.
    e.target.value = '';
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPendingFile(file);
  };

  const clearPending = () => setPendingFile(null);

  return { inputRef, openPicker, handleFileChange, pendingFile, clearPending, error, setError };
}
