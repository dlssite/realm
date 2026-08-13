import React from 'react';
import { X, FileText, Sparkles, BookOpen, Layers, Plus } from 'lucide-react';

export type WikiTemplateItem = {
  id: string;
  name: string;
  description?: string | null;
  content?: any;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  templates: WikiTemplateItem[];
  onSelectTemplate: (template: WikiTemplateItem) => void;
  onSaveAsTemplate?: (() => void) | undefined;
};

const DEFAULT_PRESETS: Array<{ id: string; name: string; description: string; icon: any; content: any }> = [
  {
    id: 'preset-rfc',
    name: 'Architecture RFC / Tech Spec',
    description: 'Structure system design proposals, trade-offs, security considerations, and implementation steps.',
    icon: Layers,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'RFC: [Feature/Architecture Title]' }] },
        {
          type: 'callout',
          attrs: { variant: 'info' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Status: Draft | Author: @user | Reviewers: @team' }] }],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Summary & Objectives' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Brief overview of the technical change and problem being solved.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Proposed Architecture' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Detail the component design, data flow, and API contracts.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Security & Scalability' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Considerations for data privacy, authentication, and load spikes.' }] },
      ],
    },
  },
  {
    id: 'preset-meeting',
    name: 'Engineering Meeting Notes',
    description: 'Keep track of attendees, agenda topics, discussion notes, and actionable task items.',
    icon: FileText,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Sync: [Topic Name] - ' + new Date().toLocaleDateString() }] },
        {
          type: 'callout',
          attrs: { variant: 'note' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Attendees: ' }] }],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Key item 1' }] }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up on API response time' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'preset-onboarding',
    name: 'Developer Onboarding Guide',
    description: 'Step-by-step setup guide for local development, environment variables, and repo overview.',
    icon: BookOpen,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🚀 Team Onboarding Guide' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Welcome to the team! Follow this checklist to get up and running.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Environment Setup' }] },
        { type: 'codeBlock', attrs: { language: 'bash' }, content: [{ type: 'text', text: 'pnpm install\npnpm dev' }] },
      ],
    },
  },
];

export function TemplateModal({ isOpen, onClose, templates, onSelectTemplate, onSaveAsTemplate }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#0c0c0e] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23] bg-[#09090b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#fafafa]">Document Templates</h2>
              <p className="text-xs text-[#a1a1aa]">Choose a preset blueprint or workspace template to start writing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Preset Blueprints */}
          <div>
            <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">System Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DEFAULT_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectTemplate({
                        id: preset.id,
                        name: preset.name,
                        description: preset.description,
                        content: preset.content,
                      });
                      onClose();
                    }}
                    className="flex flex-col text-left p-4 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/50 hover:bg-[#17171c] transition group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <IconComponent className="w-4 h-4 text-[#7c3aed] group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-sm text-[#fafafa] group-hover:text-white">{preset.name}</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] line-clamp-2">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Workspace Templates */}
          {templates.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Custom Workspace Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className="flex flex-col text-left p-4 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/50 hover:bg-[#17171c] transition group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <FileText className="w-4 h-4 text-[#a1a1aa] group-hover:text-[#7c3aed] transition-colors" />
                      <span className="font-semibold text-sm text-[#fafafa] truncate">{template.name}</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] line-clamp-2">{template.description || 'Custom template'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1f1f23] bg-[#09090b]">
          {onSaveAsTemplate ? (
            <button
              onClick={() => {
                onSaveAsTemplate();
                onClose();
              }}
              className="flex items-center space-x-2 text-xs text-[#7c3aed] hover:text-[#9353d3] font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save current active page as template</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#1f1f23] hover:bg-[#27272a] text-xs text-[#fafafa] font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateModal;
