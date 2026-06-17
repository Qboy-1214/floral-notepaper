import { useRef, useCallback, useEffect } from "react";
import { MarkdownPreview } from "../features/markdown/MarkdownPreview";

interface LiveEditorProps {
  content: string;
  onChange: (value: string) => void;
  fontSize?: number;
  imageBaseDir?: string;
  renderHtml?: boolean;
}

export function LiveEditor({
  content,
  onChange,
  fontSize,
  imageBaseDir,
  renderHtml,
}: LiveEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && previewRef.current) {
      previewRef.current.scrollTop = textareaRef.current.scrollTop;
      previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

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
        <MarkdownPreview
          content={content}
          fontSize={fontSize}
          imageBaseDir={imageBaseDir}
          renderHtml={renderHtml}
        />
      </div>
      {/* textarea 层：文字透明，光标可见 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full resize-none bg-transparent outline-none px-5 py-4 leading-[1.9] font-body"
        style={{
          color: "transparent",
          caretColor: "var(--color-ink)",
          fontSize: fontSize ? `${fontSize}px` : undefined,
          tabSize: "var(--tab-indent-size, 2)",
        }}
        spellCheck={false}
      />
    </div>
  );
}
