import React, { useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  FolderDown,
  Layers,
  Trash2,
} from 'lucide-react';

export type PageItem = {
  id: string;
  title: string;
  parentId?: string | null;
};

type TreeNode = PageItem & { children: TreeNode[] };

type Props = {
  pages: PageItem[];
  selectedId?: string | null | undefined;
  onSelect: (id: string) => void;
  onMove?: ((pageId: string, newParentId: string | null) => void) | undefined;
  onCreateChild?: ((parentId: string) => void) | undefined;
  onDeletePage?: ((pageId: string) => void) | undefined;
};

function buildTree(pages: PageItem[]) {
  const map = new Map<string, TreeNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function buildMap(pages: PageItem[]) {
  return new Map(pages.map((page) => [page.id, page]));
}

function isDescendant(pageMap: Map<string, PageItem>, ancestorId: string, pageId: string): boolean {
  let current = pageMap.get(pageId);
  while (current) {
    if (current.parentId === ancestorId) return true;
    if (!current.parentId) return false;
    current = pageMap.get(current.parentId);
  }
  return false;
}

export function SidebarTree({ pages, selectedId, onSelect, onMove, onCreateChild, onDeletePage }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const roots = buildTree(pages);
  const pageMap = buildMap(pages);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragOver = (event: React.DragEvent, id: string | null) => {
    event.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverId(null);
  };

  const handleDrop = (event: React.DragEvent, targetId: string | null) => {
    event.preventDefault();
    setDragOverId(null);
    if (!onMove) return;
    const pageId = event.dataTransfer.getData('text/plain');
    if (!pageId) return;
    if (pageId === targetId) return;
    if (targetId && isDescendant(pageMap, pageId, targetId)) return;
    onMove(pageId, targetId);
  };

  const filteredPages = searchQuery.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const renderNode = (node: TreeNode, depth = 0) => {
    const isSelected = selectedId === node.id;
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children.length > 0;
    const isDropTarget = dragOverId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/plain', node.id)}
          onDragOver={(event) => handleDragOver(event, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, node.id)}
          onClick={() => onSelect(node.id)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            isDropTarget
              ? 'bg-[#7c3aed]/20 border border-[#7c3aed]'
              : isSelected
              ? 'bg-[#7c3aed]/15 text-[#fafafa] border border-[#7c3aed]/30 font-semibold'
              : 'text-[#a1a1aa] hover:bg-[#151518] hover:text-[#fafafa]'
          }`}
        >
          <div className="flex items-center space-x-1.5 overflow-hidden flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-0.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}

            <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#7c3aed]' : 'text-[#a1a1aa]'}`} />
            <span className="truncate">{node.title || 'Untitled'}</span>
          </div>

          <div className="flex items-center gap-1">
            {onCreateChild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChild(node.id);
                }}
                title="Add subpage"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            {onDeletePage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePage(node.id);
                }}
                title="Delete page"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#7f1d1d] text-[#fca5a5] hover:text-white transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Input */}
      <div className="p-2 pb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#a1a1aa]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wiki pages..."
            className="w-full bg-[#121215] border border-[#1f1f23] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
          />
        </div>
      </div>

      {/* Root Drop Zone */}
      <div
        onDragOver={(event) => handleDragOver(event, null)}
        onDragLeave={handleDragLeave}
        onDrop={(event) => handleDrop(event, null)}
        className={`mx-2 mb-2 p-2 rounded-lg border border-dashed text-[11px] flex items-center justify-center space-x-1.5 transition ${
          dragOverId === null
            ? 'bg-[#7c3aed]/10 border-[#7c3aed]/50 text-[#a78bfa]'
            : 'border-[#1f1f23] text-[#52525b] hover:border-[#27272a]'
        }`}
      >
        <FolderDown className="w-3.5 h-3.5" />
        <span>Move to root hierarchy</span>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filteredPages ? (
          filteredPages.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#52525b]">No matching pages</div>
          ) : (
            filteredPages.map((page) => (
              <div
                key={page.id}
                onClick={() => onSelect(page.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                  selectedId === page.id
                    ? 'bg-[#7c3aed]/15 text-[#fafafa] border border-[#7c3aed]/30'
                    : 'text-[#a1a1aa] hover:bg-[#151518] hover:text-[#fafafa]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span className="truncate">{page.title || 'Untitled'}</span>
              </div>
            ))
          )
        ) : roots.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-[#52525b]">
            <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No pages created yet. Click <span className="text-[#a1a1aa] font-medium">+ New</span> to get started.
          </div>
        ) : (
          roots.map((r) => renderNode(r))
        )}
      </div>
    </div>
  );
}

export default SidebarTree;
