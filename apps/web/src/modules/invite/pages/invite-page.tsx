import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  Building2, CheckCircle, XCircle, Loader2, ShieldCheck,
  LogIn, UserPlus, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteDetails {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'expired' }
  | { status: 'already_accepted' }
  | { status: 'ready'; invite: InviteDetails }
  | { status: 'accepted' }
  | { status: 'declined' };

type AuthMode = 'login' | 'register';

// ─── Role badge colours ───────────────────────────────────────────────────────

const roleBadgeClass: Record<string, string> = {
  OWNER:   'bg-[#2d1f3d] text-[#a78bfa]',
  ADMIN:   'bg-[#1e2d3d] text-[#60a5fa]',
  MANAGER: 'bg-[#1e3028] text-[#34d399]',
  MEMBER:  'bg-[#2a2a2a] text-[#e4e4e7]',
  GUEST:   'bg-[#2a2010] text-[#fbbf24]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Form fields
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isDeclining, setIsDeclining]     = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // ── 1. Look up the invitation ─────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setPageState({ status: 'error', message: 'No invitation token found in the URL.' });
      return;
    }

    const lookup = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/invitations/${token}`);
        const data = await res.json();

        if (res.status === 410) {
          const isAccepted = data.error?.code === 'GONE' && data.error.message.includes('accepted');
          setPageState(isAccepted ? { status: 'already_accepted' } : { status: 'expired' });
          return;
        }

        if (!res.ok) {
          setPageState({ status: 'error', message: data.error?.message ?? 'Failed to load invitation.' });
          return;
        }

        setEmail(data.email);
        setPageState({ status: 'ready', invite: data });
      } catch {
        setPageState({ status: 'error', message: 'Could not reach the server. Please try again.' });
      }
    };

    lookup();
  }, [token]);

  // ── 2. Decline ────────────────────────────────────────────────────────────

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      // Best-effort — we don't block navigation if the server errors
      await fetch(`http://localhost:4000/api/v1/invitations/${token}/decline`, {
        method: 'DELETE',
      });
    } catch {
      // ignore network errors — the intent is still to leave
    } finally {
      setIsDeclining(false);
      setPageState({ status: 'declined' });
    }
  };

  // ── 3. Accept — authenticated user one-click ──────────────────────────────

  const handleAutoAccept = async () => {
    if (pageState.status !== 'ready') return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const currentToken = useAuthStore.getState().token;
      const res = await fetch(`http://localhost:4000/api/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({ action: 'authenticated' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error?.message ?? 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setAuth(data.user, data.workspace, data.token);
      navigate('/dashboard', { replace: true });
    } catch {
      setFormError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── 4. Accept — login / register form ────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pageState.status !== 'ready') return;
    setIsSubmitting(true);
    setFormError(null);

    const body =
      authMode === 'login'
        ? { action: 'login' as const, email, password }
        : { action: 'register' as const, name, email, password };

    try {
      const res = await fetch(`http://localhost:4000/api/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setAuth(data.user, data.workspace, data.token);
      // Immediate redirect — no artificial delay
      navigate('/dashboard', { replace: true });
    } catch {
      setFormError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Redirect after decline ────────────────────────────────────────────────

  useEffect(() => {
    if (pageState.status === 'declined') {
      // Give the user a moment to see the feedback, then send home
      const t = setTimeout(() => {
        if (isAuthenticated) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth/login', { replace: true });
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [pageState.status, isAuthenticated, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa] font-sans px-4 py-12">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-lg shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageState.status === 'loading') {
    return shell(
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
        <p className="text-sm text-[#a1a1aa]">Loading invitation…</p>
      </div>
    );
  }

  // ── Declined ──────────────────────────────────────────────────────────────
  if (pageState.status === 'declined') {
    return shell(
      <div className="flex flex-col items-center py-12 px-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#27272a] flex items-center justify-center">
          <X className="w-6 h-6 text-[#a1a1aa]" />
        </div>
        <h2 className="text-xl font-bold">Invitation Declined</h2>
        <p className="text-sm text-[#a1a1aa]">
          You've declined the invitation. The invite has been removed — you'll need to be
          re-invited to join this workspace.
        </p>
        <Loader2 className="w-4 h-4 text-[#52525b] animate-spin" />
        <p className="text-xs text-[#52525b]">Redirecting you…</p>
      </div>
    );
  }

  // ── Terminal error states ─────────────────────────────────────────────────
  if (pageState.status === 'error') {
    return shell(
      <div className="flex flex-col items-center py-12 px-8 space-y-4 text-center">
        <XCircle className="w-12 h-12 text-[#f87171]" />
        <h2 className="text-xl font-bold">Invalid Invitation</h2>
        <p className="text-sm text-[#a1a1aa]">{pageState.message}</p>
        <Link to="/auth/login" className="mt-2 text-sm text-[#7c3aed] hover:underline">
          Go to sign in →
        </Link>
      </div>
    );
  }

  if (pageState.status === 'expired') {
    return shell(
      <div className="flex flex-col items-center py-12 px-8 space-y-4 text-center">
        <XCircle className="w-12 h-12 text-[#f97316]" />
        <h2 className="text-xl font-bold">Invitation Expired</h2>
        <p className="text-sm text-[#a1a1aa]">
          This invitation link has expired. Ask a workspace admin to send you a new one.
        </p>
        <Link to="/auth/login" className="mt-2 text-sm text-[#7c3aed] hover:underline">
          Go to sign in →
        </Link>
      </div>
    );
  }

  if (pageState.status === 'already_accepted') {
    return shell(
      <div className="flex flex-col items-center py-12 px-8 space-y-4 text-center">
        <CheckCircle className="w-12 h-12 text-[#34d399]" />
        <h2 className="text-xl font-bold">Already Accepted</h2>
        <p className="text-sm text-[#a1a1aa]">
          This invitation has already been used. Sign in to access your workspace.
        </p>
        <Link to="/auth/login" className="mt-2 text-sm text-[#7c3aed] hover:underline font-medium">
          Sign in →
        </Link>
      </div>
    );
  }

  // ── Ready — main invite card ──────────────────────────────────────────────
  if (pageState.status !== 'ready') return null;
  const { invite } = pageState;
  const roleClass = roleBadgeClass[invite.role] ?? roleBadgeClass['MEMBER'];
  const expiryDate = new Date(invite.expiresAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return shell(
    <>
      {/* Header */}
      <div className="bg-[#0f0f12] border-b border-[#1f1f23] px-8 py-6 flex flex-col items-center space-y-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-[#7c3aed]" />
        </div>
        <div>
          <p className="text-xs text-[#a1a1aa] uppercase tracking-widest font-semibold mb-1">
            You've been invited to
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{invite.workspace.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleClass}`}>
            {invite.role}
          </span>
        </div>
        <p className="text-xs text-[#52525b]">Expires {expiryDate} · Sent to {invite.email}</p>
      </div>

      {/* Body */}
      <div className="px-8 py-6">

        {/* ── Logged-in: one-click join + decline ── */}
        {isAuthenticated && user ? (
          <div className="space-y-3">
            <p className="text-sm text-[#a1a1aa] text-center">
              Signed in as <span className="text-[#fafafa] font-medium">{user.email}</span>
            </p>

            {formError && (
              <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded">
                {formError}
              </div>
            )}

            {/* Join button */}
            <button
              onClick={handleAutoAccept}
              disabled={isSubmitting || isDeclining}
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              <span>{isSubmitting ? 'Joining…' : `Join ${invite.workspace.name}`}</span>
            </button>

            {/* Decline — inline confirm */}
            {confirmDecline ? (
              <div className="flex items-center justify-center space-x-3 text-sm">
                <span className="text-[#a1a1aa] text-xs">Decline and remove this invite?</span>
                <button
                  onClick={handleDecline}
                  disabled={isDeclining}
                  className="text-xs font-semibold text-[#f87171] hover:text-[#fca5a5] disabled:opacity-50 transition-colors"
                >
                  {isDeclining ? 'Declining…' : 'Yes, decline'}
                </button>
                <button
                  onClick={() => setConfirmDecline(false)}
                  className="text-xs text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDecline(true)}
                disabled={isSubmitting || isDeclining}
                className="w-full border border-[#2a2a2e] hover:border-[#f87171]/50 text-[#a1a1aa] hover:text-[#f87171] text-sm font-medium py-2.5 rounded transition-colors flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Decline invitation</span>
              </button>
            )}

            <p className="text-center text-xs text-[#52525b]">
              Wrong account?{' '}
              <button
                onClick={() => { useAuthStore.getState().clearAuth(); setAuthMode('login'); }}
                className="text-[#7c3aed] hover:underline"
              >
                Sign out
              </button>
            </p>
          </div>
        ) : (

          /* ── Not logged in: login / register tabs ── */
          <div className="space-y-5">
            {/* Auth mode toggle */}
            <div className="flex bg-[#09090b] border border-[#1f1f23] rounded-md p-0.5">
              <button
                onClick={() => { setAuthMode('login'); setFormError(null); }}
                className={`flex-1 flex items-center justify-center space-x-1.5 text-xs font-medium py-1.5 rounded transition-colors ${
                  authMode === 'login'
                    ? 'bg-[#1f1f23] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in to accept</span>
              </button>
              <button
                onClick={() => { setAuthMode('register'); setFormError(null); }}
                className={`flex-1 flex items-center justify-center space-x-1.5 text-xs font-medium py-1.5 rounded transition-colors ${
                  authMode === 'register'
                    ? 'bg-[#1f1f23] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create account</span>
              </button>
            </div>

            {formError && (
              <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name — register only */}
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Alex Johnson"
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                  />
                </div>
              )}

              {/* Email — locked to invite address */}
              <div>
                <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Email address</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm text-[#a1a1aa] cursor-not-allowed focus:outline-none"
                  title="Email address is locked to the invitation"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={authMode === 'register' ? 8 : undefined}
                  placeholder={authMode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                />
              </div>

              {/* Join button */}
              <button
                type="submit"
                disabled={isSubmitting || isDeclining}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === 'login' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? 'Joining…'
                    : authMode === 'login'
                    ? `Sign in & join ${invite.workspace.name}`
                    : `Create account & join ${invite.workspace.name}`}
                </span>
              </button>
            </form>

            {/* Decline — inline confirm */}
            {confirmDecline ? (
              <div className="flex items-center justify-center space-x-3">
                <span className="text-[#a1a1aa] text-xs">Decline and remove this invite?</span>
                <button
                  onClick={handleDecline}
                  disabled={isDeclining}
                  className="text-xs font-semibold text-[#f87171] hover:text-[#fca5a5] disabled:opacity-50 transition-colors"
                >
                  {isDeclining ? 'Declining…' : 'Yes, decline'}
                </button>
                <button
                  onClick={() => setConfirmDecline(false)}
                  className="text-xs text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDecline(true)}
                disabled={isSubmitting || isDeclining}
                className="w-full border border-[#2a2a2e] hover:border-[#f87171]/50 text-[#a1a1aa] hover:text-[#f87171] text-sm font-medium py-2.5 rounded transition-colors flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Decline invitation</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default InvitePage;
