# 花笺 待办改造 — 完整设计文档

> 创建时间：2026-06-16
> 状态：待用户审核
> 关联分析：`Docs/待办改造分析.md`

---

## 一、全局架构

六个改造问题涉及前端 UI、Rust 后端、配置系统三个层面。按依赖关系和实施顺序分为三个阶段：

```
阶段一（基础层）
├── 问题一：目录层级 → 递归扫描 + 树形 UI + 本地/远程双 Tab
├── 问题六：主题皮肤 → 主题定义 + 明暗切换入口
└── 问题三：Mermaid 图表 → 前端渲染支持

阶段二（体验层）
├── 问题四：即时渲染 → Overlay 覆盖层编辑器
└── 问题二：滚动同步 → 分栏模式同步

阶段三（扩展层）
└── 问题五：远程目录 → nas-md API 接入
```

阶段一完成后，花笺的核心能力（目录浏览、主题切换、图表渲染）就位。阶段二提升编辑体验。阶段三接入远程数据源。

---

## 二、问题一：目录层级 + 本地/远程双 Tab

### 设计目标

- 递归扫描所有子目录，映射为层级分类
- UI 上每级目录可折叠/展开，类似 Obsidian
- 分"本地"和"远程"两个 Tab

### Rust 后端改动

**移除 `ensure_notes_suffix`**

`src-tauri/src/services/notes.rs` 中的 `ensure_notes_suffix` 函数不再追加 `notes` 子目录。用户选择的目录路径直接作为 `notes_dir`。

**新增递归扫描函数**

```rust
/// 递归扫描目录，返回所有 .md 文件的元数据
/// category 为相对于 notes_dir 的相对路径（用 "/" 分隔）
fn scan_dir_recursive(
    &self,
    dir: &Path,
    category: &str,
    notes: &mut Vec<NoteMetadata>,
) -> Result<(), AppError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let sub_category = if category.is_empty() {
                entry.file_name().to_string_lossy().to_string()
            } else {
                format!("{}/{}", category, entry.file_name().to_string_lossy())
            };
            self.scan_dir_recursive(&path, &sub_category, notes)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let metadata = self.build_note_metadata(&path, category)?;
            notes.push(metadata);
        }
    }
    Ok(())
}
```

**改造 `rebuild_metadata`**

不再区分"根部扫描"和"子目录扫描"，统一调用 `scan_dir_recursive`。

**`list_categories` 改为递归收集**

返回所有层级的分类路径（如 `["项目A", "项目A/子目录B", "日常"]`）。

**`create_category` 支持层级路径**

创建 `项目A/子目录B` 时，自动创建 `notes_dir/项目A/子目录B/` 目录结构。

**`note_path_in_category` 支持层级路径**

文件路径 = `notes_dir / category / file.md`，category 中的 `/` 对应目录分隔符。

**旧配置迁移**

`save_config` 中检测旧配置：如果 `notes_dir` 以 `\notes` 结尾且该目录下没有 `.md` 文件，自动上移一级。

### 前端改动

**笔记列表区域重构**

`src/components/MainWindow.tsx` 中，笔记列表区域改为双 Tab 结构：

```
┌─────────────────────────────────────┐
│  [ 本地 ]  [ 远程 ]                  │  ← Tab 栏
├─────────────────────────────────────┤
│  📁 项目A                    [▼]    │  ← 可折叠目录
│    📁 子目录B                [▼]    │
│      📄 某个.md                     │
│    📄 设计.md                       │
│  📁 日常                    [▼]    │
│    📄 备忘.md                       │
│  📄 随手.md                         │  ← 根目录文件
└─────────────────────────────────────┘
```

**新建 `src/components/DirectoryTree.tsx`**

树形目录组件，功能：

- 递归渲染目录树
- 点击目录名展开/折叠
- 点击 `.md` 文件打开笔记
- 当前选中文件高亮
- 新建笔记按钮在选中的目录下创建

**新建 `src/components/SourceTabBar.tsx`**

Tab 切换栏，两个 Tab：本地 / 远程。远程 Tab 在阶段三完成前显示空状态（提示"请在设置中配置远程数据源"）。

**类型扩展**

`src/features/notes/types.ts` 中 `NoteMetadata` 的 `category` 字段格式不变（仍用 `/` 分隔），但语义扩展为支持多层。

### GFM Alert 多主题适配

`App.css` 末尾的 GFM Alert 暗色覆盖当前只针对 `data-theme="dark"`。需要改为：

- 将 Alert 边框色和背景色从硬编码改为 CSS 变量
- 在 `themes.ts` 的主题定义中增加 Alert 相关颜色变量（或使用已有变量派生）
- 移除 `App.css` 中的 `:root[data-theme="dark"] .markdown-alert-*` 覆盖块

### 涉及文件

| 文件                               | 改动类型                                            |
| ---------------------------------- | --------------------------------------------------- |
| `src-tauri/src/services/notes.rs`  | 重构：移除 ensure_notes_suffix，新增递归扫描        |
| `src-tauri/src/lib.rs`             | 微调：旧配置迁移逻辑                                |
| `src/components/MainWindow.tsx`    | 重构：笔记列表区域改为 DirectoryTree + SourceTabBar |
| `src/components/DirectoryTree.tsx` | 新建                                                |
| `src/components/SourceTabBar.tsx`  | 新建                                                |
| `src/features/notes/types.ts`      | 微调：category 字段注释更新                         |

---

## 三、问题六：主题皮肤切换

### 设计目标

- 支持多套知名主题（亮/暗各若干）
- 保留亮/暗切换的标题栏按钮和快捷键
- 主题选择器在设置面板中

### 主题定义

新建 `src/features/themes.ts`，导出主题注册表：

```ts
export interface ThemeDef {
  id: string; // 如 "light", "dark", "solarized-light", "nord-dark"
  name: string; // 显示名
  type: "light" | "dark"; // 用于判断磁贴颜色等
  colors: Record<string, string>; // CSS 变量名 → 颜色值
}

export const THEMES: ThemeDef[] = [
  {
    id: "light",
    name: "花笺白",
    type: "light",
    colors: {
      "color-paper": "#f6f3ec",
      "color-paper-warm": "#f0ebe0",
      // ... 全部 17 个颜色变量
    },
  },
  {
    id: "dark",
    name: "墨夜",
    type: "dark",
    colors: {
      "color-paper": "#222120",
      // ...
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    type: "light",
    colors: {
      /* Solarized 配色 */
    },
  },
  {
    id: "nord-dark",
    name: "Nord Dark",
    type: "dark",
    colors: {
      /* Nord 配色 */
    },
  },
  // 可扩展：dracula-dark, github-dark, tokyo-night 等
];

export function getThemeById(id: string): ThemeDef | undefined {
  return THEMES.find((t) => t.id === id);
}
```

### 类型扩展

`src/features/settings/types.ts` 中 `ThemeOption` 从 `"light" | "dark" | "system"` 扩展为 `string`（主题 id），保留 `"system"` 作为特殊值。

```ts
export type ThemeOption = string; // "light" | "dark" | "system" | "solarized-light" | "nord-dark" | ...
```

### 主题应用逻辑

改造 `src/features/settings/theme.ts`：

```ts
export function applyTheme(option: ThemeOption): void {
  const root = document.documentElement;

  if (option === "system") {
    // 跟随系统：用默认主题（花笺白/墨夜）+ 系统亮暗
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themeId = prefersDark ? "dark" : "light";
    applyThemeColors(getThemeById(themeId)!.colors);
    root.setAttribute("data-theme", themeId);
  } else if (option === "light" || option === "dark") {
    // 快捷明暗切换：用默认主题
    applyThemeColors(getThemeById(option)!.colors);
    root.setAttribute("data-theme", option);
  } else {
    // 具体主题名
    const theme = getThemeById(option);
    if (theme) {
      applyThemeColors(theme.colors);
      root.setAttribute("data-theme", option);
    }
  }
}

function applyThemeColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }
}
```

### 标题栏明暗切换按钮

在标题栏（`src/components/MainWindow.tsx` 或专门的标题栏组件）增加一个按钮，点击在 light/dark 之间切换。

快捷键：`Cmd/Ctrl + Shift + T`（可配置）。

### 设置面板主题选择器

`src/components/SettingsPanel.tsx` 中，主题选项从 `THEMES` 数组动态生成，以网格预览形式展示（每个主题一个小色块预览卡）。

### 磁贴颜色适配

`src/features/settings/tileColor.ts` 改为读取当前主题的 `type` 字段：

```ts
export function resolveSystemTileColor(): string {
  const themeId = document.documentElement.getAttribute("data-theme") || "light";
  const theme = getThemeById(themeId);
  if (theme?.type === "dark") return SYSTEM_TILE_COLOR_DARK;
  return SYSTEM_TILE_COLOR_LIGHT;
}
```

### index.html 阻塞脚本

需要在 HTML 中内联默认主题（花笺白）的 colors 对象，确保首次渲染前 CSS 变量已设置。或者接受短暂闪烁（因为 JS 执行很快，实际感知不到）。

选择：内联花笺白的 colors 到 `index.html` 的阻塞脚本中。

### 涉及文件

| 文件                                               | 改动类型                          |
| -------------------------------------------------- | --------------------------------- |
| `src/features/themes.ts`                           | 新建：主题注册表                  |
| `src/features/settings/theme.ts`                   | 重构：支持主题对象 + 明暗快捷切换 |
| `src/features/settings/types.ts`                   | 微调：ThemeOption 扩展            |
| `src/features/settings/tileColor.ts`               | 微调：适配主题 type               |
| `src/components/SettingsPanel.tsx`                 | 改造：主题选择器 UI               |
| `src/components/MainWindow.tsx`                    | 新增：标题栏明暗切换按钮          |
| `index.html`                                       | 修改：阻塞脚本内联默认主题        |
| `src/locales/{zh-CN,en-US,zh-HK}/translation.json` | 新增：主题名称翻译                |

---

## 四、问题三：Mermaid 图表

### 设计目标

- 在 Markdown 编辑器中识别 ` ```mermaid ` 代码块
- 渲染为 Mermaid 图表（SVG）

### 实现方式

**安装依赖**

```bash
npm install mermaid
```

**懒加载策略**

Mermaid 包体积约 300KB+，采用按需加载：

- 应用启动时不加载 mermaid
- `MarkdownPreview` 组件在首次遇到 `language-mermaid` 代码块时，动态 `import("mermaid")` 并缓存
- 后续代码块复用已加载的模块

**改造 `MarkdownPreview.tsx`**

自定义 `code` 组件，对 `language-mermaid` 的代码块特殊处理：

```tsx
// 懒加载 + 缓存
let mermaidPromise: Promise<typeof import("mermaid")> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
      return m;
    });
  }
  return mermaidPromise;
}

// 自定义 code 组件
const components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match ? match[1] : "";

    if (lang === "mermaid") {
      return <MermaidDiagram code={String(children)} />;
    }
    // 普通代码块保持原有渲染
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};
```

**新建 `src/features/markdown/MermaidDiagram.tsx`**

```tsx
import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface Props {
  code: string;
}

export function MermaidDiagram({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      })
      .catch((err) => {
        if (ref.current) {
          ref.current.textContent = `Mermaid 渲染错误: ${err.message}`;
        }
      });
  }, [code]);

  return <div ref={ref} className="mermaid-container" />;
}
```

### 涉及文件

| 文件                                        | 改动类型               |
| ------------------------------------------- | ---------------------- |
| `src/features/markdown/MarkdownPreview.tsx` | 改造：自定义 code 组件 |
| `src/features/markdown/MermaidDiagram.tsx`  | 新建                   |
| `package.json`                              | 新增：mermaid 依赖     |

---

## 五、问题四：即时渲染（Overlay 覆盖层）

### 设计目标

- 新增"即时渲染"（live）视图模式
- textarea 上叠加 Markdown 渲染层，实现所见即所得
- 保留原生 textarea 的全部行为（输入法、撤销栈、拖拽）

### 新建 `src/components/LiveEditor.tsx`

```tsx
interface LiveEditorProps {
  content: string;
  onChange: (value: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function LiveEditor({ content, onChange, scrollRef }: LiveEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 滚动同步：textarea → 预览层
  const handleScroll = () => {
    if (textareaRef.current && previewRef.current) {
      previewRef.current.scrollTop = textareaRef.current.scrollTop;
      previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 预览层：pointer-events: none，接收滚动但不接收鼠标事件 */}
      <div
        ref={previewRef}
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <MarkdownPreview content={content} />
      </div>
      {/* textarea 层：文字透明，光标可见 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-ink"
        spellCheck={false}
      />
    </div>
  );
}
```

### 样式要点

```css
/* textarea 文字透明，只显示光标 */
.live-editor textarea {
  color: transparent;
  caret-color: var(--color-ink);
}

/* 预览层不可交互 */
.live-editor .preview-layer {
  pointer-events: none;
}
```

### 视图模式切换

`ViewMode` 类型扩展为 `"edit" | "split" | "preview" | "live"`。

标题栏增加视图模式切换按钮组（图标按钮），快捷键：

- `Cmd/Ctrl + 1` → 编辑
- `Cmd/Ctrl + 2` → 即时渲染
- `Cmd/Ctrl + 3` → 分栏
- `Cmd/Ctrl + 4` → 预览

### 涉及文件

| 文件                                               | 改动类型                            |
| -------------------------------------------------- | ----------------------------------- |
| `src/components/LiveEditor.tsx`                    | 新建                                |
| `src/features/settings/types.ts`                   | 修改：ViewMode 增加 "live"          |
| `src/features/settings/api.ts`                     | 修改：normalizeViewMode 识别 "live" |
| `src/components/MainWindow.tsx`                    | 改造：视图区域增加 live 分支        |
| `src/components/SettingsPanel.tsx`                 | 新增：默认视图选项                  |
| `src/App.css`                                      | 新增：LiveEditor 相关样式           |
| `src/locales/{zh-CN,en-US,zh-HK}/translation.json` | 新增：翻译                          |

---

## 六、问题二：分栏模式滚动同步

### 设计目标

- 分栏模式下编辑区和预览区滚动同步
- 基于滚动比例（百分比）同步，而非绝对像素值
- 防止循环触发

### 实现位置

`src/components/MainWindow.tsx` 中，分栏模式的编辑器和预览区。

### 核心逻辑

```tsx
const isSyncing = useRef(false);

const syncEditorToPreview = () => {
  if (isSyncing.current) return;
  isSyncing.current = true;
  const editor = editorRef.current;
  const preview = previewRef.current;
  if (editor && preview) {
    const ratio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight || 0);
  }
  requestAnimationFrame(() => {
    isSyncing.current = false;
  });
};

const syncPreviewToEditor = () => {
  if (isSyncing.current) return;
  isSyncing.current = true;
  const editor = editorRef.current;
  const preview = previewRef.current;
  if (editor && preview) {
    const ratio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
    editor.scrollTop = ratio * (editor.scrollHeight - editor.clientHeight || 0);
  }
  requestAnimationFrame(() => {
    isSyncing.current = false;
  });
};
```

### 锚点点击处理

Markdown 预览中标题带有锚点（`rehype-slug`），点击锚点会改变预览区的 `scrollTop`。此时不应反向同步到编辑器。解决方案：给预览区的 `onScroll` 加一个标记，如果是锚点点击触发的滚动（通过 `hashchange` 事件判断），跳过同步。

### 涉及文件

| 文件                            | 改动类型                   |
| ------------------------------- | -------------------------- |
| `src/components/MainWindow.tsx` | 改造：分栏模式加入滚动同步 |

---

## 七、问题五：远程目录（nas-md API 接入）

### 设计目标

- 通过 nas-md 的 HTTP API 接入远程目录
- 远程目录与本地目录并列，通过 Tab 切换
- 支持浏览、打开、编辑远程笔记

### nas-md API 摘要

| 接口                              | 方法   | 说明               |
| --------------------------------- | ------ | ------------------ |
| `/api/mounts`                     | GET    | 列出所有挂载点     |
| `/api/mounts/{id}/tree`           | GET    | 获取目录树（单层） |
| `/api/mounts/{id}/tree-recursive` | GET    | 递归获取完整目录树 |
| `/api/mounts/{id}/file?path=xxx`  | GET    | 获取文件内容       |
| `/api/mounts/{id}/file?path=xxx`  | PUT    | 写入/创建文件      |
| `/api/mounts/{id}/file?path=xxx`  | DELETE | 删除文件           |
| `/api/mounts/{id}/rename`         | PUT    | 重命名             |
| `/api/mounts/{id}/mkdir`          | PUT    | 创建目录           |

### 前端实现

**新建 `src/features/remote/api.ts`**

封装 nas-md API 调用：

```ts
export interface RemoteMount {
  id: string;
  name: string;
  path: string;
  type: string;
}

export interface RemoteTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: RemoteTreeNode[];
}

export async function fetchMounts(baseUrl: string): Promise<RemoteMount[]> {
  const res = await fetch(`${baseUrl}/api/mounts`);
  return res.json();
}

export async function fetchTree(
  baseUrl: string,
  mountId: string,
  path?: string,
): Promise<RemoteTreeNode[]> {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  const res = await fetch(`${baseUrl}/api/mounts/${mountId}/tree?${params}`);
  return res.json();
}

export async function fetchFile(baseUrl: string, mountId: string, path: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/mounts/${mountId}/file?path=${encodeURIComponent(path)}`);
  return res.text();
}

export async function saveFile(
  baseUrl: string,
  mountId: string,
  path: string,
  content: string,
): Promise<void> {
  await fetch(`${baseUrl}/api/mounts/${mountId}/file?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
}
```

**新建 `src/features/remote/types.ts`**

远程数据源配置类型：

```ts
export interface RemoteSource {
  id: string;
  name: string;
  baseUrl: string; // 如 "http://10.10.77.91:2443"
}
```

**改造 `DirectoryTree.tsx`**

远程 Tab 下，从 nas-md API 获取目录树，复用相同的树形渲染逻辑。每个 mount 作为一级目录。

**设置面板新增远程数据源配置**

`src/components/SettingsPanel.tsx` 中新增"远程数据源"配置区：

- 添加/编辑/删除远程数据源
- 输入名称和 URL
- 点击"测试连接"验证 API 可用性

### 涉及文件

| 文件                                               | 改动类型                |
| -------------------------------------------------- | ----------------------- |
| `src/features/remote/api.ts`                       | 新建：nas-md API 封装   |
| `src/features/remote/types.ts`                     | 新建：远程数据源类型    |
| `src/components/DirectoryTree.tsx`                 | 改造：支持远程数据源    |
| `src/components/SettingsPanel.tsx`                 | 新增：远程数据源配置    |
| `src/features/settings/types.ts`                   | 新增：RemoteSource 类型 |
| `src/locales/{zh-CN,en-US,zh-HK}/translation.json` | 新增：翻译              |

---

## 八、实施顺序

```
阶段一（基础层）
├── 1. 主题皮肤系统（themes.ts + theme.ts 改造）
├── 2. Mermaid 图表支持
├── 3. 目录层级递归扫描（Rust 后端）
└── 4. 目录树 UI + 本地/远程 Tab

阶段二（体验层）
├── 5. 即时渲染（LiveEditor）
└── 6. 分栏滚动同步

阶段三（扩展层）
└── 7. 远程目录（nas-md API 接入）
```

每个阶段完成后可独立测试和发布。

---

## 九、风险与注意事项

1. **Rust 后端递归扫描性能**：如果用户目录下有大量文件（数千个），递归扫描可能阻塞。建议增加扫描进度提示，或限制递归深度（如最多 10 层）。

2. **主题 CSS 变量与 Tailwind v4**：`@theme` 块在构建时生成默认值，运行时 `style.setProperty()` 优先级更高。但需要确保所有 Tailwind 类名都通过 `var()` 引用 CSS 变量，而非硬编码颜色值。

3. **Mermaid 包体积**：mermaid 约 300KB+，会增大前端包体积。可考虑懒加载（仅在首次遇到 mermaid 代码块时动态 import）。

4. **Overlay 光标对齐**：中文字体、标题、列表等场景下光标可能与渲染内容有偏移。这是 Overlay 方案的固有局限，后续可通过 contenteditable 方案替代。

5. **nas-md API 认证**：当前 nas-md 部署在内网，无需认证。如果后续暴露到公网，需要增加 token 认证机制。

6. **旧配置迁移**：移除 `ensure_notes_suffix` 后，旧用户的 `notes_dir` 配置需要迁移逻辑，避免笔记"消失"。
