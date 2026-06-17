import { useState, useMemo, useCallback } from "react";
import type { NoteMetadata } from "../features/notes/types";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  noteIds: string[];
}

function buildTree(categories: string[], notes: NoteMetadata[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [], noteIds: [] };
  const dirMap = new Map<string, TreeNode>();
  dirMap.set("", root);

  for (const cat of categories) {
    const parts = cat.split("/");
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!dirMap.has(currentPath)) {
        const node: TreeNode = {
          name: parts[i],
          path: currentPath,
          isDir: true,
          children: [],
          noteIds: [],
        };
        dirMap.set(currentPath, node);
        const parent = dirMap.get(parentPath);
        if (parent) parent.children.push(node);
      }
    }
  }

  for (const note of notes) {
    const cat = note.category || "";
    const dir = dirMap.get(cat);
    if (dir) {
      dir.noteIds.push(note.id);
    } else {
      root.noteIds.push(note.id);
    }
  }

  return root.children;
}

interface DirectoryTreeProps {
  notes: NoteMetadata[];
  categories: string[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote?: (category: string) => void;
}

export function DirectoryTree({
  notes,
  categories,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
}: DirectoryTreeProps) {
  const tree = useMemo(() => buildTree(categories, notes), [categories, notes]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const noteMap = useMemo(() => {
    const map = new Map<string, NoteMetadata>();
    for (const note of notes) {
      map.set(note.id, note);
    }
    return map;
  }, [notes]);

  return (
    <div className="px-2 py-1">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          collapsed={collapsed}
          onToggle={toggleCollapse}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onCreateNote={onCreateNote}
          noteMap={noteMap}
        />
      ))}
    </div>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote?: (category: string) => void;
  noteMap: Map<string, NoteMetadata>;
}

function TreeNodeItem({
  node,
  depth,
  collapsed,
  onToggle,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  noteMap,
}: TreeNodeItemProps) {
  const isCollapsed = collapsed.has(node.path);
  const hasChildren = node.children.length > 0 || node.noteIds.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none hover:bg-paper-warm/60 transition-colors ${
          depth === 0 ? "text-[13px]" : "text-[12px]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) onToggle(node.path);
        }}
      >
        {hasChildren ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`shrink-0 text-ink-faint transition-transform ${isCollapsed ? "" : "rotate-90"}`}
          >
            <path
              d="M3 1l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="w-[10px] shrink-0" />
        )}
        <span className="text-ink-soft truncate">{node.name}</span>
        {onCreateNote && (
          <button
            type="button"
            className="ml-auto opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer text-[14px] leading-none"
            onClick={(e) => {
              e.stopPropagation();
              onCreateNote(node.path);
            }}
            title={`在 ${node.name} 中新建笔记`}
          >
            +
          </button>
        )}
      </div>

      {!isCollapsed && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onCreateNote={onCreateNote}
              noteMap={noteMap}
            />
          ))}
          {node.noteIds.map((noteId) => {
            const note = noteMap.get(noteId);
            if (!note) return null;
            const isSelected = noteId === selectedNoteId;
            return (
              <div
                key={noteId}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer select-none transition-colors ${
                  isSelected ? "bg-bamboo-mist/60 text-ink" : "text-ink-soft hover:bg-paper-warm/60"
                }`}
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                onClick={() => onSelectNote(noteId)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  className="shrink-0 text-ink-faint"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span className="truncate text-[12px]">
                  {note.title || note.preview.slice(0, 20) || "无标题"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
