# 阶段三：远程目录（nas-md API 接入）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过 nas-md HTTP API 接入远程目录，与本地目录并列显示

**Architecture:** 前端通过 HTTP fetch 调用 nas-md 的 RESTful API，获取挂载点和目录树。远程数据源配置存储在 AppConfig 中。复用 DirectoryTree 组件渲染远程目录。

**Tech Stack:** React 19, TypeScript, fetch API

---

### Task 1: 远程数据源类型定义

**Files:**

- Create: `src/features/remote/types.ts`
- Modify: `src/features/settings/types.ts`

- [ ] **Step 1: 创建远程数据源类型**

新建 `src/features/remote/types.ts`：

```ts
export interface RemoteSource {
  id: string;
  name: string;
  baseUrl: string; // 如 "http://10.10.77.91:2443"
}

export interface RemoteMount {
  id: string;
  name: string;
  path: string;
  type: string;
  owner: string;
  host: string;
  public: boolean;
}

export interface RemoteTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: RemoteTreeNode[];
  size?: number;
  mtime?: number;
}
```

- [ ] **Step 2: AppConfig 增加远程数据源配置**

在 `src/features/settings/types.ts` 的 `AppConfig` 接口中增加：

```ts
export interface AppConfig {
  // ... 现有字段 ...
  remoteSources?: RemoteSource[];
}
```

- [ ] **Step 3: 提交**

```bash
git add src/features/remote/types.ts src/features/settings/types.ts
git commit -m "feat(remote): 远程数据源类型定义 + AppConfig 扩展"
```

---

### Task 2: nas-md API 封装

**Files:**

- Create: `src/features/remote/api.ts`

- [ ] **Step 1: 创建 API 封装**

新建 `src/features/remote/api.ts`：

```ts
import type { RemoteMount, RemoteTreeNode } from "./types";

export async function fetchMounts(baseUrl: string): Promise<RemoteMount[]> {
  const res = await fetch(`${baseUrl}/api/mounts`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Failed to fetch mounts: ${res.status}`);
  return res.json();
}

export async function fetchRecursiveTree(
  baseUrl: string,
  mountId: string,
  path?: string,
): Promise<RemoteTreeNode[]> {
  const params = new URLSearchParams();
  if (path && path !== "/") params.set("path", path);
  const url = `${baseUrl}/api/mounts/${mountId}/tree-recursive${params.toString() ? "?" + params : ""}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Failed to fetch tree: ${res.status}`);
  return res.json();
}

export async function fetchFile(baseUrl: string, mountId: string, path: string): Promise<string> {
  const res = await fetch(
    `${baseUrl}/api/mounts/${mountId}/file?path=${encodeURIComponent(path)}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return res.text();
}

export async function saveFile(
  baseUrl: string,
  mountId: string,
  path: string,
  content: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/mounts/${mountId}/file?path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: content,
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Failed to save file: ${res.status}`);
}

export async function deleteFile(baseUrl: string, mountId: string, path: string): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/mounts/${mountId}/file?path=${encodeURIComponent(path)}`,
    {
      method: "DELETE",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
}

export async function createDirectory(
  baseUrl: string,
  mountId: string,
  path: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/mounts/${mountId}/mkdir?path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Failed to create directory: ${res.status}`);
}

export async function renameFile(
  baseUrl: string,
  mountId: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl}/api/mounts/${mountId}/rename?old=${encodeURIComponent(oldPath)}&new=${encodeURIComponent(newPath)}`,
    {
      method: "PUT",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Failed to rename: ${res.status}`);
}

export async function testConnection(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/remote/api.ts
git commit -m "feat(remote): nas-md RESTful API 封装"
```

---

### Task 3: 远程数据源设置面板

**Files:**

- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/locales/zh-CN/translation.json`
- Modify: `src/locales/en-US/translation.json`
- Modify: `src/locales/zh-HK/translation.json`

- [ ] **Step 1: 扩展 i18n 翻译**

zh-CN:

```json
"remoteSources": "远程数据源",
"addRemoteSource": "添加远程数据源",
"editRemoteSource": "编辑远程数据源",
"deleteRemoteSource": "删除远程数据源",
"remoteSourceName": "名称",
"remoteSourceUrl": "URL",
"testConnection": "测试连接",
"connectionSuccess": "连接成功",
"connectionFailed": "连接失败",
"confirmDeleteRemote": "确定要删除远程数据源「{name}」吗？"
```

en-US:

```json
"remoteSources": "Remote Sources",
"addRemoteSource": "Add Remote Source",
"editRemoteSource": "Edit Remote Source",
"deleteRemoteSource": "Delete Remote Source",
"remoteSourceName": "Name",
"remoteSourceUrl": "URL",
"testConnection": "Test Connection",
"connectionSuccess": "Connection successful",
"connectionFailed": "Connection failed",
"confirmDeleteRemote": "Delete remote source '{name}'?"
```

zh-HK:

```json
"remoteSources": "遠端數據源",
"addRemoteSource": "新增遠端數據源",
"editRemoteSource": "編輯遠端數據源",
"deleteRemoteSource": "刪除遠端數據源",
"remoteSourceName": "名稱",
"remoteSourceUrl": "URL",
"testConnection": "測試連線",
"connectionSuccess": "連線成功",
"connectionFailed": "連線失敗",
"confirmDeleteRemote": "確定要刪除遠端數據源「{name}」嗎？"
```

- [ ] **Step 2: SettingsPanel 增加远程数据源配置区**

在 `src/components/SettingsPanel.tsx` 中，在现有设置区下方增加"远程数据源"配置区：

```tsx
import { useState } from "react";
import type { RemoteSource } from "../features/remote/types";
import { testConnection } from "../features/remote/api";

// 在 SettingsPanel 组件内部增加 state：
const [remoteSources, setRemoteSources] = useState<RemoteSource[]>(config.remoteSources || []);
const [editingRemote, setEditingRemote] = useState<RemoteSource | null>(null);
const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);

// 远程数据源配置 UI：
<section className="space-y-2">
  <label className="block text-[11px] font-body text-ink-faint">
    {t("remoteSources", { defaultValue: "远程数据源" })}
  </label>

  {remoteSources.map((src) => (
    <div key={src.id} className="flex items-center gap-2 p-2 rounded-lg border border-paper-deep">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-ink font-medium truncate">{src.name}</div>
        <div className="text-[10px] text-ink-faint font-mono truncate">{src.baseUrl}</div>
      </div>
      <button
        onClick={() => handleTestConnection(src.baseUrl)}
        className="px-2 py-1 text-[10px] rounded bg-paper-warm text-ink-soft hover:bg-paper-deep"
      >
        {t("testConnection", { defaultValue: "测试连接" })}
      </button>
      <button onClick={() => setEditingRemote(src)} className="text-ink-faint hover:text-ink-soft">
        ✏️
      </button>
      <button
        onClick={() => handleDeleteRemote(src.id)}
        className="text-ink-faint hover:text-red-500"
      >
        🗑️
      </button>
    </div>
  ))}

  <button
    onClick={() => setEditingRemote({ id: crypto.randomUUID(), name: "", baseUrl: "" })}
    className="w-full py-1.5 text-[11px] rounded-lg border border-dashed border-paper-deep text-ink-faint hover:border-stone hover:text-ink-soft"
  >
    + {t("addRemoteSource", { defaultValue: "添加远程数据源" })}
  </button>
</section>;
```

- [ ] **Step 3: 远程数据源编辑弹窗**

新建 `src/components/RemoteSourceDialog.tsx`（或内联在 SettingsPanel 中）：

包含：

- 名称输入框
- URL 输入框
- 测试连接按钮
- 保存 / 取消按钮

- [ ] **Step 4: 提交**

```bash
git add src/components/SettingsPanel.tsx src/components/RemoteSourceDialog.tsx src/locales/
git commit -m "feat(remote): 远程数据源设置面板 + 测试连接"
```

---

### Task 4: 远程目录树加载 + 复用 DirectoryTree

**Files:**

- Modify: `src/components/DirectoryTree.tsx`
- Modify: `src/components/MainWindow.tsx`

- [ ] **Step 1: 改造 DirectoryTree 支持远程数据**

扩展 `DirectoryTree` 的 props：

```tsx
interface DirectoryTreeProps {
  notes: NoteMetadata[];
  categories: string[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (category: string) => void;
  // 新增：远程数据
  remoteSources?: RemoteSource[];
  remoteMounts?: Map<string, RemoteMount[]>;
  remoteTrees?: Map<string, RemoteTreeNode[]>;
  onFetchRemoteMounts?: (sourceId: string) => Promise<void>;
  onFetchRemoteTree?: (sourceId: string, mountId: string, path?: string) => Promise<void>;
}
```

- [ ] **Step 2: 远程 Tab 加载逻辑**

在 `MainWindow.tsx` 中，切换到远程 Tab 时：

```tsx
const [remoteData, setRemoteData] = useState<Map<string, RemoteTreeNode[]>>(new Map());
const [remoteLoading, setRemoteLoading] = useState(false);

const loadRemoteData = useCallback(async (source: RemoteSource) => {
  setRemoteLoading(true);
  try {
    const mounts = await fetchMounts(source.baseUrl);
    const trees = new Map<string, RemoteTreeNode[]>();
    for (const mount of mounts) {
      const tree = await fetchRecursiveTree(source.baseUrl, mount.id);
      trees.set(mount.id, tree);
    }
    setRemoteData(trees);
  } catch (err) {
    showToast(`加载远程数据源「${source.name}」失败: ${err.message}`);
  } finally {
    setRemoteLoading(false);
  }
}, []);
```

- [ ] **Step 3: 远程目录树渲染**

远程 Tab 下，将 `remoteData` 转换为 DirectoryTree 可消费的格式。每个 mount 作为一级目录节点，目录树递归展开。

远程笔记的 ID 格式为 `{sourceId}/{mountId}/{path}`，与本地笔记 ID 区分。

- [ ] **Step 4: 远程笔记打开与保存**

点击远程笔记时：

1. 调用 `fetchFile(baseUrl, mountId, path)` 获取内容
2. 在编辑器中打开（与本地笔记共用编辑器）
3. 保存时调用 `saveFile(baseUrl, mountId, path, content)` 写回远程

- [ ] **Step 5: 提交**

```bash
git add src/components/DirectoryTree.tsx src/components/MainWindow.tsx
git commit -m "feat(remote): 远程目录树加载 + 复用 DirectoryTree + 远程笔记读写"
```
