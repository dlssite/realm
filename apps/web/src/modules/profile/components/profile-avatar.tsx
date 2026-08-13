import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';

interface ProfileAvatarProps {
  name: string;
  avatarUrl: string | null;
  isSaving: boolean;
  onSaveAvatar: (url: string | null) => void;
}

/**
 * Avatar upload / clear section.
 * For now accepts a direct URL input (MinIO presigned upload is a future task).
 */
export function ProfileAvatar({ name, avatarUrl, isSaving, onSaveAvatar }: ProfileAvatarProps) {
  const [urlInput, setUrlInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-6">
      {/* Avatar circle */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-[#27272a]"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center text-2xl font-bold text-white ring-2 ring-[#27272a]">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowInput((p) => !p)}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1f1f23] border border-[#27272a] flex items-center justify-center hover:bg-[#27272a] transition-colors"
          aria-label="Change avatar"
        >
          <Camera className="w-3.5 h-3.5 text-[#a1a1aa]" />
        </button>
      </div>

      {/* Info + controls */}
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold text-[#fafafa]">{name}</p>
          <p className="text-xs text-[#71717a] mt-0.5">
            Square image, min 200 × 200 px recommended
          </p>
        </div>

        {showInput && (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste image URL…"
              className="flex-1 bg-[#09090b] border border-[#27272a] rounded-md px-3 py-1.5 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
            />
            <button
              type="button"
              disabled={isSaving || !urlInput.trim()}
              onClick={() => {
                onSaveAvatar(urlInput.trim() || null);
                setShowInput(false);
                setUrlInput('');
              }}
              className="px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md font-medium flex items-center gap-1.5 transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save
            </button>
          </div>
        )}

        {avatarUrl && !showInput && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveAvatar(null)}
            className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#ef4444] transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Remove avatar
          </button>
        )}
      </div>
    </div>
  );
}
