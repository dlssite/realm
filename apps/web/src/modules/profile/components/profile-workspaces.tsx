import React from 'react';
import { Building2, Crown, Shield, Users, UserCircle, Eye, LucideProps } from 'lucide-react';

interface WorkspaceMembership {
  role: string;
  workspace: { id: string; name: string; slug: string };
}

interface ProfileWorkspacesProps {
  memberships: WorkspaceMembership[];
  activeWorkspaceId: string | undefined;
}

type LucideIcon = React.ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
>;

interface RoleMeta {
  label: string;
  Icon: LucideIcon;
  color: string;
}

const ROLE_META: Record<string, RoleMeta> = {
  OWNER:   { label: 'Owner',   Icon: Crown,       color: '#f59e0b' },
  ADMIN:   { label: 'Admin',   Icon: Shield,      color: '#7c3aed' },
  MANAGER: { label: 'Manager', Icon: Users,       color: '#3b82f6' },
  MEMBER:  { label: 'Member',  Icon: UserCircle,  color: '#a1a1aa' },
  GUEST:   { label: 'Guest',   Icon: Eye,         color: '#52525b' },
};

const FALLBACK_META: RoleMeta = { label: 'Member', Icon: UserCircle, color: '#a1a1aa' };

/**
 * Read-only list of workspaces the current user belongs to,
 * with their role badge in each one.
 */
export function ProfileWorkspaces({ memberships, activeWorkspaceId }: ProfileWorkspacesProps) {
  if (!memberships || memberships.length === 0) {
    return (
      <p className="text-sm text-[#71717a]">You are not a member of any workspace.</p>
    );
  }

  return (
    <div className="space-y-2">
      {memberships.map(({ role, workspace }) => {
        const meta = ROLE_META[role] ?? FALLBACK_META;
        const { Icon } = meta;
        const isActive = workspace.id === activeWorkspaceId;

        return (
          <div
            key={workspace.id}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
              isActive
                ? 'border-[#7c3aed]/40 bg-[#7c3aed]/5'
                : 'border-[#1f1f23] bg-[#0c0c0e]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                  isActive ? 'bg-[#7c3aed]' : 'bg-[#27272a]'
                }`}
              >
                {workspace.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[#fafafa] flex items-center gap-2">
                  {workspace.name}
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/15 text-[#7c3aed] font-semibold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#71717a] font-mono">{workspace.slug}</p>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: meta.color, backgroundColor: `${meta.color}18` }}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
