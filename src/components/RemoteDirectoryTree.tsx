import { useState, useMemo, useCallback } from "react";
import type { RemoteMount, RemoteTreeNode } from "../features/remote/types";

interface RemoteDirectoryTreeProps {
  mounts: RemoteMount[];
  trees: Map<string, RemoteTreeNode[]>;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onFetchTree: (mountId: string, path?: string) => Promise<void>;
  loading?: boolean;
}

export function RemoteDirectoryTree({
  mounts,
  trees,
  selectedNoteId,
  onSelectNote,
  onFetchTree,
  loading,
}: RemoteDirectoryTreeProps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-[12px] text-ink-faint">
        <svg
          className="animate-spin w-4 h-4 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        加载中…
      </div>
    );
  }

  if (mounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[12px] text-ink-faint">
        暂无远程挂载点
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      {mounts.map((mount) => {
        const tree = trees.get(mount.id);
        return (
          <MountNode
            key={mount.id}
            mount={mount}
            tree={tree}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
            onFetchTree={onFetchTree}
          />
        );
      })}
    </div>
  );
}

interface MountNodeProps {
  mount: RemoteMount;
  tree?: RemoteTreeNode[];
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onFetchTree: (mountId: string, path?: string) => void;
}

function MountNode({
  mount,
  tree,
  collapsed,
  onToggle,
  selectedNoteId,
  onSelectNote,
  onFetchTree,
}: MountNodeProps) {
  const mountKey = `mount:${mount.id}`;
  const isCollapsed = collapsed.has(mountKey);
  const hasChildren = tree !== undefined && tree.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none hover:bg-paper-warm/60 transition-colors text-[13px]"
        onClick={() => {
          onToggle(mountKey);
          if (!tree && !isCollapsed) {
            void onFetchTree(mount.id);
          }
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
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          className="shrink-0 text-bamboo/70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-ink-soft truncate">{mount.name}</span>
        <span className="text-[10px] text-ink-ghost/50 font-mono ml-auto shrink-0">
          {mount.path}
        </span>
      </div>
      {!isCollapsed && tree && (
        <div>
          {tree.map((node) => (
            <RemoteTreeNodeItem
              key={node.path}
              node={node}
              mountId={mount.id}
              depth={1}
              collapsed={collapsed}
              onToggle={onToggle}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onFetchTree={onFetchTree}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RemoteTreeNodeItemProps {
  node: RemoteTreeNode;
  mountId: string;
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onFetchTree: (mountId: string, path?: string) => void;
}

function RemoteTreeNodeItem({
  node,
  mountId,
  depth,
  collapsed,
  onToggle,
  selectedNoteId,
  onSelectNote,
  onFetchTree,
}: RemoteTreeNodeItemProps) {
  const nodeKey = `${mountId}:${node.path}`;
  const isCollapsed = collapsed.has(nodeKey);
  const isSelected = selectedNoteId === nodeKey;
  const isDir = node.is_dir;
  const hasChildren = node.children !== undefined && node.children.length > 0;

  const handleClick = () => {
    if (isDir) {
      onToggle(nodeKey);
      if (!node.children && !isCollapsed) {
        void onFetchTree(mountId, node.path);
      }
    } else {
      onSelectNote(nodeKey);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none transition-colors ${
          isSelected ? "bg-bamboo-mist/60 text-ink" : "text-ink-soft hover:bg-paper-warm/60"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDir ? (
          hasChildren ? (
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
          )
        ) : (
          <span className="w-[10px] shrink-0" />
        )}
        {isDir ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            className="shrink-0 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ) : (
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
        )}
        <span className="truncate text-[12px]">{node.name}</span>
      </div>
      {!isCollapsed && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <RemoteTreeNodeItem
              key={child.path}
              node={child}
              mountId={mountId}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onFetchTree={onFetchTree}
            />
          ))}
        </div>
      )}
    </div>
  );
}
