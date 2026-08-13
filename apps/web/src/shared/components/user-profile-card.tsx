/**
 * UserProfileCard
 *
 * Reusable profile card rendered as a popover when a user avatar or name
 * is hovered / clicked anywhere in the app.
 *
 * The component is deliberately split across three files to stay within
 * the 300-line constitution limit (§14.3):
 *   user-profile-card.constants.ts  — design-system color maps
 *   user-profile-card.sections.tsx  — all sub-components
 *   user-profile-card.tsx           — root shell + public export (this file)
 *
 * Sub-components are attached as static properties so callers can compose
 * custom layouts:
 *
 *   <UserProfileCard data={d} isLoading={false} />          // full card
 *   <UserProfileCard.Header data={d} />                     // header only
 *   <UserProfileCard.Projects data={d} />                   // projects only
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { UserProfileCardData } from '@realm/types';
import {
  Header, Stats, Teams, Projects, Tasks,
  LoadingSkeleton, ErrorState,
  Avatar, Divider, SectionHeading,
} from './user-profile-card.sections';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UserProfileCardProps {
  data?: UserProfileCardData | null;
  isLoading?: boolean;
  error?: string | null;
  /** When set, renders a "View full profile" link in the footer */
  profileHref?: string | undefined;
  /** Extension slot — future modules inject extra sections here */
  children?: React.ReactNode;
}

// ── Root shell ────────────────────────────────────────────────────────────────

function UserProfileCardRoot({
  data,
  isLoading,
  error,
  profileHref,
  children,
}: UserProfileCardProps) {
  return (
    <div className="w-72 bg-[#0c0c0e] border border-[#27272a] rounded-xl
      shadow-2xl shadow-black/60 overflow-hidden
      animate-in fade-in zoom-in-95 duration-150">

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          <Header data={data} />

          {Object.keys(data.taskCounts).length > 0 && (
            <><Divider /><Stats data={data} /></>
          )}

          {data.teams.length > 0 && (
            <><Divider /><Teams data={data} /></>
          )}

          <Divider />
          <Projects data={data} />

          {data.assignedTasks.length > 0 && (
            <><Divider /><Tasks data={data} /></>
          )}

          {children && (
            <><Divider /><div className="px-4 pb-3 pt-2">{children}</div></>
          )}

          {profileHref != null && (
            <>
              <Divider />
              <div className="px-4 py-2">
                <a href={profileHref}
                  className="inline-flex items-center gap-1 text-[10px] text-[#7c3aed]
                    hover:text-[#a78bfa] transition-colors">
                  <ExternalLink className="w-2.5 h-2.5" />
                  View full profile
                </a>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Attach sub-components as static properties ────────────────────────────────

export const UserProfileCard = Object.assign(UserProfileCardRoot, {
  Header,
  Stats,
  Teams,
  Projects,
  Tasks,
  LoadingSkeleton,
  Avatar,
  Divider,
  SectionHeading,
});
