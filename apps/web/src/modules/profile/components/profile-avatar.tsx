import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, AlertCircle } from 'lucide-react';
import {
  getAvatarUploadUrl,
  uploadAvatarToStorage,
  confirmAvatarUpload,
  deleteAvatar,
} from '../api/profile-api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface ProfileAvatarProps {
  name: string;
  avatarUrl: string | null;
  token: string;
  /** Called after a successful upload or removal with the updated UserProfile avatarUrl */
  onAvatarChange: (avatarUrl: string | null) => void;
}

/**
 * Avatar upload section.
 * Flow: pick file → get presigned PUT URL → PUT directly to MinIO → confirm with API.
 */
export function ProfileAvatar({ name, avatarUrl, token, onAvatarChange }: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Local preview URL (object URL) shown while upload is in progress */
  const [preview, setPreview] = useState<string | null>(null);

  const isBusy = uploading || removing;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayUrl = preview ?? avatarUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file fires the event again
    e.target.value = '';
    if (!file) return;

    setError(null);

    // ── Client-side validation ────────────────────────────────────────────────
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, GIF and WebP images are supported.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Show a local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      // Step 1 — get presigned PUT URL
      const { uploadUrl, storageKey } = await getAvatarUploadUrl(token, file.type);

      // Step 2 — PUT directly to MinIO
      await uploadAvatarToStorage(uploadUrl, file);

      // Step 3 — confirm with API (verifies object exists, generates persistent URL)
      const updated = await confirmAvatarUpload(token, storageKey);

      onAvatarChange(updated.avatarUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;
    setError(null);
    setRemoving(true);
    try {
      const updated = await deleteAvatar(token);
      onAvatarChange(updated.avatarUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      {/* ── Avatar circle ── */}
      <div className="relative flex-shrink-0">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-[#27272a]"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center text-2xl font-bold text-white ring-2 ring-[#27272a]">
            {initials}
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Camera button — triggers hidden file input */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1f1f23] border border-[#27272a] flex items-center justify-center hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Change avatar"
        >
          <Camera className="w-3.5 h-3.5 text-[#a1a1aa]" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Info + controls ── */}
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold text-[#fafafa]">{name}</p>
          <p className="text-xs text-[#71717a] mt-0.5">
            JPEG, PNG, GIF or WebP · max {MAX_SIZE_MB} MB · square image recommended
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 text-xs text-[#f87171]">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1f23] hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed border border-[#27272a] text-[#e4e4e7] text-xs rounded-md font-medium transition-colors"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>

          {avatarUrl && !uploading && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
