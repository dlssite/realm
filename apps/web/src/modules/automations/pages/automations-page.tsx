/**
 * AutomationsPage — Coming Soon placeholder.
 *
 * TO REPLACE: Delete this file and update the route in `src/app/router.tsx`
 * to point to your real automations page implementation.
 */

import React from 'react';
import { ComingSoonPage } from '../../../shared/components/coming-soon-page';
import {
  Zap,
  GitMerge,
  BotMessageSquare,
  Bell,
  Webhook,
  Play,
} from 'lucide-react';

export function AutomationsPage() {
  return (
    <ComingSoonPage
      moduleName="Automations"
      tagline="No-code workflow automation engine — connect triggers to actions across every Realm module and eliminate repetitive manual work."
      ModuleIcon={Zap}
      accentColor="text-[#facc15]"
      accentBg="bg-[#facc15]/10"
      accentBorder="border-[#facc15]/20"
      phase="Phase 6"
      features={[
        {
          icon: Play,
          title: 'Trigger → Action Rules',
          description: 'Define "when X happens, do Y" rules using a visual builder — no code required.',
        },
        {
          icon: GitMerge,
          title: 'Cross-Module Workflows',
          description: 'Trigger actions across Tasks, Projects, Wiki, and Chat from a single automation rule.',
        },
        {
          icon: BotMessageSquare,
          title: 'AI-Powered Actions',
          description: 'Invoke Emberlyn AI to auto-summarise, generate tasks, or draft documents as part of any workflow.',
        },
        {
          icon: Bell,
          title: 'Smart Notifications',
          description: 'Route alerts to the right channel or person based on dynamic conditions you define.',
        },
        {
          icon: Webhook,
          title: 'Webhooks & Integrations',
          description: 'Send outbound webhooks or receive external events to integrate with GitHub, Slack, and more.',
        },
      ]}
    />
  );
}

export default AutomationsPage;
