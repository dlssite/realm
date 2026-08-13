/**
 * AnalyticsPage — Coming Soon placeholder.
 *
 * TO REPLACE: Delete this file and update the route in `src/app/router.tsx`
 * to point to your real analytics page implementation.
 */

import React from 'react';
import { ComingSoonPage } from '../../../shared/components/coming-soon-page';
import {
  LineChart,
  BarChart2,
  TrendingUp,
  Target,
  Users2,
  Download,
} from 'lucide-react';

export function AnalyticsPage() {
  return (
    <ComingSoonPage
      moduleName="Analytics"
      tagline="Deep performance insights across projects, tasks, and teams — turn raw workspace data into decisions with interactive charts and custom reports."
      ModuleIcon={LineChart}
      accentColor="text-[#60a5fa]"
      accentBg="bg-[#60a5fa]/10"
      accentBorder="border-[#60a5fa]/20"
      phase="Phase 6"
      features={[
        {
          icon: BarChart2,
          title: 'Project Health Dashboard',
          description: 'Completion rates, overdue tasks, and velocity trends for every active project at a glance.',
        },
        {
          icon: TrendingUp,
          title: 'Sprint Velocity',
          description: 'Track task throughput over time to spot bottlenecks and forecast delivery accurately.',
        },
        {
          icon: Target,
          title: 'Goal Progress',
          description: 'OKR-style progress tracking that aggregates milestone and task data automatically.',
        },
        {
          icon: Users2,
          title: 'Team Workload',
          description: 'Visualise assignee load distribution to catch overallocation before it becomes a problem.',
        },
        {
          icon: Download,
          title: 'Custom Reports & Export',
          description: 'Build tailored reports and export to CSV or PDF for stakeholder sharing.',
        },
      ]}
    />
  );
}

export default AnalyticsPage;
