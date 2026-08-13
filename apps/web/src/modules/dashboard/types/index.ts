import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export type WidgetCategory = 'overview' | 'work' | 'knowledge' | 'ai';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  size: WidgetSize;
  component: React.ComponentType;
  order: number;
  category: WidgetCategory;
}

export interface NavCounts {
  projects: number;
  tasks: number;
  chat: number;
}
