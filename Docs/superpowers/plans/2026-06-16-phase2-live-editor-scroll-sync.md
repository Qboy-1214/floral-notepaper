# 阶段二：即时渲染 + 分栏滚动同步

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增即时渲染（Overlay 覆盖层）视图模式，分栏模式加入滚动同步

**Architecture:** 即时渲染通过 textarea + pointer-events:none 预览层叠加实现；滚动同步通过滚动百分比映射 + isSyncing 防循环实现

**Tech Stack:** React 19, TypeScript, Tailwind v4

---

### Task 1: LiveEditor 组件

**Files:**

- Create: `src/components/LiveEditor.tsx`
- Modify: `src/App.css`
- Modify: `src/features/settings/types.ts`
- Modify: `src/features/settings/api.ts`
- Modify: `src/locales/zh-CN/translation.json`
- Modify: `src/locales/en-US/translation.json`
- Modify: `src/locales/zh-HK/translation.json`

- [ ] **Step 1: 扩展 i18n 翻译**

在三个 locale 文件的 `settings` 段中增加翻译：

zh-CN:

```json
"live": "即时",
"viewMode": "视图模式",
"viewModeDesc": "选择编辑器的视图模式"
```

en-US:

```json
"live": "Live",
"viewMode": "View Mode",
"viewModeDesc": "Choose the editor view mode"
```

zh-HK:

```json
"live": "即時",
"viewMode": "檢視模式",
"viewModeDesc": "選擇編輯器的檢視模式"
```

- [ ] **Step 2: 扩展 ViewMode 类型**

在 `src/features/settings/types.ts` 中：

```ts
export type ViewMode = "edit" | "split" | "preview" | "live";
```

- [ ] **Step 3: 扩展 normalizeViewMode**

在 `src/features/settings/api.ts` 中：

```ts
export function normalizeViewMode(value: string): ViewMode {
  if (value === "edit" || value === "split" || value === "preview" || value === "live") {
    return value;
  }
  return "split";
}
```

- [ ] **Step 4: 创建 LiveEditor 组件**

新建 `src/components/LiveEditor.tsx`：

```tsx
import { useRef, useCallback, useEffect } from "react";
import { MarkdownPreview } from "../features/markdown/MarkdownPreview";

interface LiveEditorProps {
  content: string;
  onChange: (value: string) => void;
  fontSize?: number;
  imageBaseDir?: string;
}

export function LiveEditor({ content, onChange, fontSize, imageBaseDir }: LiveEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && previewRef.current) {
      previewRef.current.scrollTop = textareaRef.current.scrollTop;
      previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // 当 content 外部切换时（如打开新笔记），重置滚动位置
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
      textareaRef.current.scrollLeft = 0;
    }
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
      previewRef.current.scrollLeft = 0;
    }
  }, [content]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 预览层：pointer-events: none */}
      <div
        ref={previewRef}
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <MarkdownPreview content={content} fontSize={fontSize} imageBaseDir={imageBaseDir} />
      </div>
      {/* textarea 层：文字透明，光标可见 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-ink outline-none p-4"
        style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
        spellCheck={false}
      />
    </div>
  );
}
```

- [ ] **Step 5: 添加 LiveEditor CSS**

在 `src/App.css` 末尾增加：

```css
/* LiveEditor: textarea 文字透明，只显示光标 */
.live-editor-layer textarea {
  color: transparent !important;
  caret-color: var(--color-ink);
  -webkit-text-fill-color: transparent;
}

.live-editor-layer textarea::selection {
  background: transparent;
}

.live-editor-layer .mermaid-container {
  pointer-events: none;
}
```

- [ ] **Step 6: 提交**

```bash
git add src/components/LiveEditor.tsx src/App.css src/features/settings/types.ts src/features/settings/api.ts src/locales/
git commit -m "feat(editor): LiveEditor 即时渲染组件 + ViewMode 扩展"
```

---

### Task 2: 视图模式切换 UI + 快捷键

**Files:**

- Modify: `src/components/MainWindow.tsx`
- Modify: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: 标题栏视图模式按钮组**

在 `src/components/MainWindow.tsx` 的标题栏区域，增加视图模式切换按钮组。四个图标按钮：

- 编辑（铅笔图标 / `edit`）
- 即时渲染（眼睛图标 / `live`）
- 分栏（分割线图标 / `split`）
- 预览（放大镜图标 / `preview`）

当前模式高亮显示。

快捷键监听：

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          setViewMode("edit");
          break;
        case "2":
          e.preventDefault();
          setViewMode("live");
          break;
        case "3":
          e.preventDefault();
          setViewMode("split");
          break;
        case "4":
          e.preventDefault();
          setViewMode("preview");
          break;
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [setViewMode]);
```

- [ ] **Step 2: 视图区域渲染分支**

在 `MainWindow.tsx` 的主内容区域，根据 `viewMode` 渲染不同组件：

```tsx
{viewMode === "edit" && (
  <textarea value={content} onChange={...} />
)}
{viewMode === "live" && (
  <LiveEditor content={content} onChange={...} fontSize={config.fontSize} imageBaseDir={imageBaseDir} />
)}
{viewMode === "split" && (
  <div className="flex split-container">
    <textarea ref={editorRef} onScroll={syncEditorToPreview} />
    <div ref={previewRef} onScroll={syncPreviewToEditor}>
      <MarkdownPreview content={content} />
    </div>
  </div>
)}
{viewMode === "preview" && (
  <MarkdownPreview content={content} />
)}
```

- [ ] **Step 3: SettingsPanel 增加默认视图选项**

在 `src/components/SettingsPanel.tsx` 中，在视图模式选项中增加"即时"：

```tsx
const viewModeOptions = [
  { value: "edit", label: t("settings.viewMode.edit", { defaultValue: "编辑" }) },
  { value: "live", label: t("settings.viewMode.live", { defaultValue: "即时" }) },
  { value: "split", label: t("settings.viewMode.split", { defaultValue: "分栏" }) },
  { value: "preview", label: t("settings.viewMode.preview", { defaultValue: "预览" }) },
];
```

- [ ] **Step 4: 提交**

```bash
git add src/components/MainWindow.tsx src/components/SettingsPanel.tsx
git commit -m "feat(editor): 视图模式切换 UI + 快捷键 Ctrl+1~4"
```

---

### Task 3: 分栏滚动同步

**Files:**

- Modify: `src/components/MainWindow.tsx`

- [ ] **Step 1: 在分栏模式下添加滚动同步**

仅在 `viewMode === "split"` 时激活。使用 `useRef` 存储 DOM 引用和同步锁：

```tsx
const editorRef = useRef<HTMLTextAreaElement>(null);
const previewRef = useRef<HTMLDivElement>(null);
const isSyncingScroll = useRef(false);
const isAnchorScroll = useRef(false);

const syncEditorToPreview = useCallback(() => {
  if (isSyncingScroll.current || !editorRef.current || !previewRef.current) return;
  isSyncingScroll.current = true;
  const editor = editorRef.current;
  const preview = previewRef.current;
  const editorScrollable = editor.scrollHeight - editor.clientHeight;
  const previewScrollable = preview.scrollHeight - preview.clientHeight;
  if (editorScrollable > 0 && previewScrollable > 0) {
    const ratio = editor.scrollTop / editorScrollable;
    preview.scrollTop = ratio * previewScrollable;
  }
  requestAnimationFrame(() => {
    isSyncingScroll.current = false;
  });
}, []);

const syncPreviewToEditor = useCallback(() => {
  if (
    isSyncingScroll.current ||
    isAnchorScroll.current ||
    !editorRef.current ||
    !previewRef.current
  )
    return;
  isSyncingScroll.current = true;
  const editor = editorRef.current;
  const preview = previewRef.current;
  const editorScrollable = editor.scrollHeight - editor.clientHeight;
  const previewScrollable = preview.scrollHeight - preview.clientHeight;
  if (editorScrollable > 0 && previewScrollable > 0) {
    const ratio = preview.scrollTop / previewScrollable;
    editor.scrollTop = ratio * editorScrollable;
  }
  requestAnimationFrame(() => {
    isSyncingScroll.current = false;
  });
}, []);
```

- [ ] **Step 2: 锚点点击处理**

监听 `hashchange` 事件，当用户点击预览区的标题锚点时，设置 `isAnchorScroll.current = true`，跳过预览→编辑的同步：

```tsx
useEffect(() => {
  const handleHashChange = () => {
    isAnchorScroll.current = true;
    setTimeout(() => {
      isAnchorScroll.current = false;
    }, 500);
  };
  window.addEventListener("hashchange", handleHashChange);
  return () => window.removeEventListener("hashchange", handleHashChange);
}, []);
```

- [ ] **Step 3: 提交**

```bash
git add src/components/MainWindow.tsx
git commit -m "feat(editor): 分栏模式滚动同步 + 锚点点击保护"
```
