import React, { useEffect, useState } from 'react';
import './callout.css';
import './suggestion.css';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Callout from '../extensions/Callout';
import SlashCommand from '../extensions/SlashCommand';
import lowlight from '../../../lib/lowlight';

import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  MessageSquare,
  CheckSquare,
  Undo,
  Redo,
  Save,
  Check,
} from 'lucide-react';

type Props = {
  initialContent?: any;
  onSave: (content: any) => Promise<void> | void;
  title?: string;
  onTitleChange?: (title: string) => void;
};

export function Editor({ initialContent, onSave, title, onTitleChange }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Blockquote,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      SlashCommand,
      TaskList,
      TaskItem,
      Placeholder.configure({ placeholder: 'Type "/" for slash commands or start typing...' }),
    ],
    content: initialContent ?? '',
  });

  useEffect(() => {
    if (!editor) return;
    if (initialContent) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const json = editor.getJSON();
      await onSave(json);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut listener for Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Top Floating Toolbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b border-[#1f1f23] bg-[#0c0c0e]/90 backdrop-blur-md">
        <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('bold')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('italic')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#1f1f23] mx-1" />

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('heading', { level: 2 })
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('heading', { level: 3 })
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#1f1f23] mx-1" />

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('bulletList')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('orderedList')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('taskList')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Task Checklist"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#1f1f23] mx-1" />

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('blockquote')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('codeBlock')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleNode('callout', 'paragraph').run()}
            className={`p-1.5 rounded-md text-xs transition ${
              editor?.isActive('callout')
                ? 'bg-[#7c3aed]/20 text-[#a78bfa]'
                : 'text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
            }`}
            title="Callout Box"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
            className="p-1.5 rounded-md text-xs text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa] transition"
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#1f1f23] mx-1" />

          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            className="p-1.5 rounded-md text-xs text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa] transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            className="p-1.5 rounded-md text-xs text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa] transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Save Action */}
        <div className="flex items-center space-x-3 pl-2">
          {justSaved ? (
            <span className="flex items-center text-xs text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5 mr-1" /> Saved
            </span>
          ) : (
            <span className="text-[11px] text-[#52525b] hidden sm:inline">⌘S to save</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
        {/* Frameless Document Title */}
        <div className="mb-6">
          <input
            type="text"
            value={title ?? ''}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder="Untitled Document"
            className="w-full bg-transparent text-3xl font-extrabold tracking-tight text-white placeholder-[#52525b] focus:outline-none border-b border-transparent focus:border-[#7c3aed]/40 pb-2 transition"
          />
        </div>

        {/* TipTap Rich Text Area */}
        <div className="prose prose-invert max-w-none focus:outline-none min-h-[400px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default Editor;
