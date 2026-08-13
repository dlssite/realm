import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

interface ProfilePasswordFormProps {
  onSubmit: (current: string, next: string) => Promise<void>;
}

/**
 * Change-password card.  Validates that new password ≥ 8 chars and the
 * confirmation matches before calling the parent handler.
 */
export function ProfilePasswordForm({ onSubmit }: ProfilePasswordFormProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strengthScore = (() => {
    let s = 0;
    if (next.length >= 8) s++;
    if (/[A-Z]/.test(next)) s++;
    if (/[0-9]/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strengthScore];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(current, next);
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current password */}
      <div>
        <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
          Current Password
        </label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 pr-10 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowCurrent((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div>
        <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 pr-10 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowNext((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {/* Strength bar */}
        {next.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: i <= strengthScore ? strengthColor : '#27272a',
                  }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: strengthColor }}>
              {strengthLabel}
            </p>
          </div>
        )}
      </div>

      {/* Confirm */}
      <div>
        <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
        />
      </div>

      {error && (
        <p className="text-xs text-[#f87171] bg-[#27171a] border border-[#7f1d1d] px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 text-xs text-[#4ade80] bg-[#14291f] border border-[#166534] px-3 py-2 rounded-md">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          Password updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md font-medium transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <KeyRound className="w-4 h-4" />
        )}
        Update Password
      </button>
    </form>
  );
}
