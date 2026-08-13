import React, { useEffect, useRef } from 'react';
import { AtSign } from 'lucide-react';
import { ChannelMemberDto, WorkspaceRole } from '@realm/types';

export interface MentionCandidate {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null | undefined;
  workspaceRole?: WorkspaceRole;
}

// ── Role badge helpers ──────────────────────────────────────────────────────

const ROLE_BADGE: Record<WorkspaceRole, { label: string; className: string } | undefined> = {
  OWNER:   { label: 'Owner',   className: 'bg-[#7c3aed]/20 text-[#a78bfa] ring-1 ring-[#7c3aed]/40' },
  ADMIN:   { label: 'Admin',   className: 'bg-[#2563eb]/20 text-[#60a5fa] ring-1 ring-[#2563eb]/40' },
  MANAGER: { label: 'Manager', className: 'bg-[#059669]/20 text-[#34d399] ring-1 ring-[#059669]/40' },
  MEMBER:  undefined,
};

interface MentionPopupProps {
  candidates: MentionCandidate[];
  activeIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  onClose: () => void;
  /** Bottom offset in px — popup sits directly above the textarea */
  bottomOffset?: number;
}

export function buildCandidates(members: ChannelMemberDto[]): MentionCandidate[] {
  return members.map(m => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    workspaceRole: m.workspaceRole,
  }));
}

export function MentionPopup({
  candidates,
  activeIndex,
  onSelect,
  onClose,
  bottomOffset = 0,
}: MentionPopupProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll the highlighted item into view whenever activeIndex changes
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (candidates.length === 0) return null;

  return (
    <>
      {/* Invisible overlay to catch outside clicks */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="absolute left-0 right-0 z-50 mx-3 overflow-hidden
          bg-[#0c0c0e] border border-[#27272a] rounded-xl shadow-2xl shadow-black/60
          animate-in fade-in slide-in-from-bottom-2 duration-100"
        style={{ bottom: `${bottomOffset}px` }}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1f1f23] select-none">
          <AtSign className="w-3 h-3 text-[#7c3aed]" />
          <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">
            Mention a member
          </span>
          <span className="ml-auto text-[10px] text-[#3f3f46] font-mono">
            {candidates.length}
          </span>
        </div>

        {/* Member list */}
        <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
          {candidates.map((c, i) => {
            const initial = c.name[0]?.toUpperCase() ?? '?';
            const isActive = i === activeIndex;

            return (
              <li key={c.userId}>
                <button
                  type="button"
                  onMouseDown={e => {
                    // mousedown fires before textarea blur — prevent losing focus
                    e.preventDefault();
                    onSelect(c);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left
                    transition-colors duration-75
                    ${isActive
                      ? 'bg-[#7c3aed]/20 text-[#fafafa]'
                      : 'text-[#a1a1aa] hover:bg-[#141417] hover:text-[#fafafa]'
                    }`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center
                    text-xs font-bold flex-shrink-0 overflow-hidden
                    ${isActive
                      ? 'bg-[#7c3aed]/40 text-[#a78bfa] ring-1 ring-[#7c3aed]/60'
                      : 'bg-[#1f1f23] text-[#71717a]'
                    }`}
                  >
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-xs font-semibold leading-none truncate
                        ${isActive ? 'text-[#fafafa]' : 'text-[#e4e4e7]'}`}
                      >
                        {c.name}
                      </p>
                      {c.workspaceRole && ROLE_BADGE[c.workspaceRole] && (
                        <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5
                          rounded-full leading-none ${ROLE_BADGE[c.workspaceRole]!.className}`}
                        >
                          {ROLE_BADGE[c.workspaceRole]!.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#52525b] leading-none mt-0.5 truncate">
                      {c.email}
                    </p>
                  </div>

                  {/* @handle hint */}
                  <span className={`text-[10px] font-mono flex-shrink-0
                    ${isActive ? 'text-[#a78bfa]' : 'text-[#3f3f46]'}`}
                  >
                    @{c.name.toLowerCase().replace(/\s+/g, '')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer hint */}
        <div className="px-3 py-1.5 border-t border-[#1f1f23] flex items-center gap-3 select-none">
          <span className="text-[9px] text-[#3f3f46]">
            <kbd className="px-1 py-0.5 rounded bg-[#1f1f23] text-[#52525b] font-mono">↑↓</kbd>
            {' '}navigate
          </span>
          <span className="text-[9px] text-[#3f3f46]">
            <kbd className="px-1 py-0.5 rounded bg-[#1f1f23] text-[#52525b] font-mono">↵</kbd>
            {' '}select
          </span>
          <span className="text-[9px] text-[#3f3f46]">
            <kbd className="px-1 py-0.5 rounded bg-[#1f1f23] text-[#52525b] font-mono">Esc</kbd>
            {' '}close
          </span>
        </div>
      </div>
    </>
  );
}
