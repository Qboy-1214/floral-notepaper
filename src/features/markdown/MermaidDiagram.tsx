import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  code: string;
}

let mermaidPromise: Promise<typeof import("mermaid")> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        flowchart: { useMaxWidth: true, htmlLabels: true },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    loadMermaid()
      .then((mermaid) => {
        if (cancelled || !ref.current) return;
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return mermaid.render(id, code).then(({ svg }) => {
          if (!cancelled && ref.current) {
            ref.current.innerHTML = svg;
          }
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-3 px-4 py-3 rounded bg-danger-bg text-sm font-mono text-red-600">
        Mermaid 渲染错误: {error}
      </div>
    );
  }

  return <div ref={ref} className="mermaid-container my-3 flex justify-center" />;
}
