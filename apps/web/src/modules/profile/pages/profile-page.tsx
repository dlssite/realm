import React, { useEffect, useState } from 'react';
import {
  UserCircle2,
  Loader2,
  CheckCircle2,
  Building2,
  KeyRound,
  AlertTriangle,
  LucideProps,
} from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import { fetchProfile, updateProfile, changePassword } from '../api/profile-api';
import { ProfileAvatar } from '../components/profile-avatar';
import { ProfilePasswordForm } from '../components/profile-password-form';
import { ProfileWorkspaces } from '../components/profile-workspaces';
import type { UserProfile } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type LucideIcon = React.ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
>;

// ── Section card wrapper ──────────────────────────────────────────────────────

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#1f1f23] flex items-center gap-3">
        <Icon className="w-4 h-4 text-[#7c3aed] flex-shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-[#fafafa]">{title}</h2>
          {description && (
            <p className="text-xs text-[#71717a] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, workspace, token, setAuth } = useAuthStore();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Display-name edit state
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Avatar save state
  const [avatarSaving, setAvatarSaving] = useState(false);

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchProfile(token)
      .then((data) => {
        setProfile(data);
        setName(data.name);
      })
      .catch(() => setFetchError('Could not load your profile. Please refresh.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile || name.trim() === profile.name) return;
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const updated = await updateProfile(token, { name: name.trim() });
      // Merge — PATCH returns only scalar fields, preserve workspaceMembers
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      // Keep auth store in sync so the sidebar initial/name updates immediately
      if (user) setAuth({ ...user, name: updated.name }, workspace, token);
      setNameSuccess(true);
      toast.success('Name updated');
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save.';
      setNameError(msg);
      toast.error('Failed to update name', msg);
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveAvatar = async (url: string | null) => {
    if (!token) return;
    setAvatarSaving(true);
    try {
      const updated = await updateProfile(token, { avatarUrl: url });
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      if (user) {
        const next = { ...user };
        if (updated.avatarUrl != null) next.avatarUrl = updated.avatarUrl;
        else delete next.avatarUrl;
        setAuth(next, workspace, token);
      }
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleChangePassword = async (current: string, next: string) => {
    if (!token) throw new Error('Not authenticated');
    try {
      await changePassword(token, { currentPassword: current, newPassword: next });
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      toast.error('Password change failed', msg);
      throw err;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[#f87171]">{fetchError ?? 'Profile not found.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#1f1f23]">
        <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#7c3aed] flex-shrink-0" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#fafafa]">My Profile</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Manage your personal information and account security
          </p>
        </div>
      </div>

      {/* ── 1. Avatar ── */}
      <Section
        icon={UserCircle2}
        title="Profile Picture"
        description="Shown across the workspace wherever your name appears"
      >
        <ProfileAvatar
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          isSaving={avatarSaving}
          onSaveAvatar={handleSaveAvatar}
        />
      </Section>

      {/* ── 2. Display name + email ── */}
      <Section
        icon={UserCircle2}
        title="Account Details"
        description="Your public display name and login email"
      >
        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
                required
                minLength={1}
                maxLength={100}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>

            {/* Email — read-only */}
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center gap-2 bg-[#09090b] border border-[#1f1f23] rounded-md px-3 py-2">
                <span className="text-sm text-[#71717a] truncate">{profile.email}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[#1f1f23] text-[#52525b] font-medium flex-shrink-0">
                  read-only
                </span>
              </div>
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-[#52525b]">
            <span>
              Member since{' '}
              <span className="text-[#71717a]">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </span>
            <span>
              Last updated{' '}
              <span className="text-[#71717a]">
                {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
          </div>

          {nameError && (
            <p className="text-xs text-[#f87171] bg-[#27171a] border border-[#7f1d1d] px-3 py-2 rounded-md">
              {nameError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={nameSaving || name.trim() === profile.name || name.trim().length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md font-medium transition-colors"
            >
              {nameSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
            {nameSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-[#4ade80]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </form>
      </Section>

      {/* ── 3. Password ── */}
      <Section
        icon={KeyRound}
        title="Password & Security"
        description="Change your account password. Must be at least 8 characters."
      >
        <ProfilePasswordForm onSubmit={handleChangePassword} />
      </Section>

      {/* ── 4. Workspace memberships ── */}
      <Section
        icon={Building2}
        title="Workspace Memberships"
        description="All workspaces you belong to and your role in each"
      >
        <ProfileWorkspaces
          memberships={profile.workspaceMembers}
          activeWorkspaceId={workspace?.id}
        />
      </Section>

      {/* ── 5. Danger zone ── */}
      <div className="bg-[#0c0c0e] border border-[#7f1d1d]/50 rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#7f1d1d]/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-[#fafafa]">Danger Zone</h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              Irreversible actions — proceed with caution
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#fafafa]">Delete account</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Permanently removes your account and all associated data.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Contact your workspace admin to request account deletion"
            className="px-3 py-1.5 border border-[#7f1d1d] text-[#f87171] text-sm rounded-md font-medium opacity-50 cursor-not-allowed hover:opacity-60 transition-opacity self-start sm:self-auto flex-shrink-0"
          >
            Delete account
          </button>
        </div>
      </div>

    </div>
  );
}
