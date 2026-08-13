/**
 * ComingSoonPage — Reusable placeholder for modules that are planned but not yet built.
 *
 * HOW TO REMOVE:
 *   1. Delete the module's `pages/<name>-page.tsx` file that renders this component.
 *   2. Replace the route in `router.tsx` with the real page import.
 *   3. That's it — this shared component can stay until all modules are shipped,
 *      then delete `src/shared/components/coming-soon-page.tsx` entirely.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

export interface ComingSoonFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ComingSoonPageProps {
  /** Module display name shown in the hero, e.g. "Calendar" */
  moduleName: string;
  /** Short sentence describing the module's purpose */
  tagline: string;
  /** Lucide icon that represents this module */
  ModuleIcon: LucideIcon;
  /** Accent colour class used for the icon glow + badge, e.g. "text-[#f59e0b]" */
  accentColor: string;
  /** Translucent background tint for the icon halo, e.g. "bg-[#f59e0b]/10" */
  accentBg: string;
  /** Border tint for the icon halo ring, e.g. "border-[#f59e0b]/20" */
  accentBorder: string;
  /** 2–4 feature highlights to render in the grid */
  features: ComingSoonFeature[];
  /** Optional roadmap phase text, e.g. "Phase 6 · Q3 2025" */
  phase?: string;
}

export function ComingSoonPage({
  moduleName,
  tagline,
  ModuleIcon,
  accentColor,
  accentBg,
  accentBorder,
  features,
  phase,
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-130px)] px-4 py-16 select-none">

      {/* ── Central card ── */}
      <div className="w-full max-w-2xl bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl">

        {/* Top shimmer stripe */}
        <div
          className="h-[3px] w-full opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent 0%, var(--stripe-color) 50%, transparent 100%)`,
          }}
        />

        {/* Card body */}
        <div className="px-8 pt-10 pb-8 space-y-8">

          {/* ── Hero ── */}
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Module icon halo */}
            <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl ${accentBg} border ${accentBorder}`}>
              <ModuleIcon className={`w-7 h-7 ${accentColor}`} />
              {/* Construction badge */}
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-[#0c0c0e] border border-[#27272a]">
                <Construction className="w-3 h-3 text-[#71717a]" />
              </span>
            </div>

            {/* Title + phase pill */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">
                  {moduleName}
                </h1>
                {phase && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-[#1f1f23] text-[#71717a] border border-[#27272a]">
                    {phase}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#a1a1aa] max-w-md mx-auto leading-relaxed">
                {tagline}
              </p>
            </div>

            {/* Coming soon pill */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${accentBg} ${accentColor} border ${accentBorder}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${accentBg.replace('/10', '/40')}`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${accentColor.replace('text-', 'bg-')}`} />
              </span>
              Coming Soon
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[#1f1f23]" />

          {/* ── Feature grid ── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b] mb-4 text-center">
              What&apos;s included
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feat) => {
                const FeatureIcon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="flex items-start gap-3 p-3.5 rounded-lg bg-[#111113] border border-[#1f1f23] hover:border-[#27272a] transition-colors group"
                  >
                    <div className={`flex-shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-md ${accentBg} border ${accentBorder}`}>
                      <FeatureIcon className={`w-3.5 h-3.5 ${accentColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#e4e4e7] leading-snug">
                        {feat.title}
                      </p>
                      <p className="text-xs text-[#71717a] mt-0.5 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer note ── */}
          <p className="text-center text-[11px] text-[#52525b]">
            This module is on the roadmap. Check back soon or contribute on GitHub.
          </p>

        </div>
      </div>

    </div>
  );
}
