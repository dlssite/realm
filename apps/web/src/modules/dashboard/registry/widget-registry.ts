import { WidgetDefinition } from '../types';
import { WorkspaceStatsWidget } from '../components/widgets/WorkspaceStatsWidget';
import { RecentTasksWidget } from '../components/widgets/RecentTasksWidget';
import { ActiveProjectsWidget } from '../components/widgets/ActiveProjectsWidget';
import { RecentWikiWidget } from '../components/widgets/RecentWikiWidget';
import { AiQuickChatWidget } from '../components/widgets/AiQuickChatWidget';
import { TrendingUp, CheckSquare, FolderKanban, BookOpen, Sparkles } from 'lucide-react';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'workspace-stats',
    title: 'Workspace Analytics Overview',
    description: 'High-level real-time performance indicators',
    icon: TrendingUp,
    size: 'full',
    component: WorkspaceStatsWidget,
    order: 1,
    category: 'overview',
  },
  {
    id: 'recent-tasks',
    title: 'Action Items & Tasks',
    description: 'My active tasks sorted by priority and due date',
    icon: CheckSquare,
    size: 'medium',
    component: RecentTasksWidget,
    order: 2,
    category: 'work',
  },
  {
    id: 'active-projects',
    title: 'Active Projects',
    description: 'Initiatives and strategic goals in progress',
    icon: FolderKanban,
    size: 'medium',
    component: ActiveProjectsWidget,
    order: 3,
    category: 'work',
  },
  {
    id: 'recent-wiki',
    title: 'Knowledge Base & Docs',
    description: 'Recently created or edited documentation articles',
    icon: BookOpen,
    size: 'medium',
    component: RecentWikiWidget,
    order: 4,
    category: 'knowledge',
  },
  {
    id: 'ai-quick-chat',
    title: 'Emberlyn AI Command',
    description: 'Quick prompt suggestions and workspace AI assistant',
    icon: Sparkles,
    size: 'medium',
    component: AiQuickChatWidget,
    order: 5,
    category: 'ai',
  },
];
