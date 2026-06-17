import { useState, useEffect } from "react";
import type { RemoteSource } from "../features/remote/types";
import { testConnection } from "../features/remote/api";

interface RemoteSourceDialogProps {
  source: RemoteSource;
  onSave: (source: RemoteSource) => void;
  onCancel: () => void;
  t: (key: string, options?: { defaultValue?: string }) => string;
}

export function RemoteSourceDialog({ source, onSave, onCancel, t }: RemoteSourceDialogProps) {
  const [name, setName] = useState(source.name);
  const [baseUrl, setBaseUrl] = useState(source.baseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    setName(source.name);
    setBaseUrl(source.baseUrl);
    setTestResult(null);
  }, [source]);

  const handleTest = async () => {
    if (!baseUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    const url = baseUrl.trim().replace(/\/+$/, "");
    const ok = await testConnection(url);
    setTestResult(ok ? "success" : "failed");
    setTesting(false);
  };

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim()) return;
    onSave({
      ...source,
      name: name.trim(),
      baseUrl: baseUrl.trim().replace(/\/+$/, ""),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-paper border border-paper-deep/40 rounded-xl shadow-2xl w-[380px] p-5 space-y-4">
        <h3 className="text-[14px] font-serif font-medium text-ink">
          {source.name
            ? t("editRemoteSource", { defaultValue: "编辑远程数据源" })
            : t("addRemoteSource", { defaultValue: "添加远程数据源" })}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-ink-faint mb-1">
              {t("remoteSourceName", { defaultValue: "名称" })}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nas-md"
              className="w-full px-3 h-8 rounded-lg text-[12px] font-body text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/60 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] text-ink-faint mb-1">
              {t("remoteSourceUrl", { defaultValue: "URL" })}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://10.10.77.91:2443"
              className="w-full px-3 h-8 rounded-lg text-[12px] font-mono text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/60 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !baseUrl.trim()}
              className="px-3 h-7 rounded-lg text-[11px] bg-paper-warm text-ink-soft hover:bg-paper-deep/40 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {testing ? "…" : t("testConnection", { defaultValue: "测试连接" })}
            </button>
            {testResult === "success" && (
              <span className="text-[11px] text-bamboo">
                ✓ {t("connectionSuccess", { defaultValue: "连接成功" })}
              </span>
            )}
            {testResult === "failed" && (
              <span className="text-[11px] text-red-400">
                ✗ {t("connectionFailed", { defaultValue: "连接失败" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 h-8 rounded-lg text-[12px] text-ink-faint hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
          >
            {t("common.cancel", { defaultValue: "取消" })}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim()}
            className="px-4 h-8 rounded-lg text-[12px] text-bamboo bg-bamboo-mist/40 hover:bg-bamboo-mist/60 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {t("common.save", { defaultValue: "保存" })}
          </button>
        </div>
      </div>
    </div>
  );
}
