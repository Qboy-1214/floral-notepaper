import { useTranslation } from "react-i18next";

interface SourceTabBarProps {
  activeTab: "local" | "remote";
  onTabChange: (tab: "local" | "remote") => void;
}

export function SourceTabBar({ activeTab, onTabChange }: SourceTabBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 p-1 bg-paper-warm/50 rounded-lg">
      <button
        type="button"
        onClick={() => onTabChange("local")}
        className={`px-3 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
          activeTab === "local"
            ? "bg-paper text-ink shadow-sm"
            : "text-ink-faint hover:text-ink-soft"
        }`}
      >
        {t("localSource", { defaultValue: "本地" })}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("remote")}
        className={`px-3 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
          activeTab === "remote"
            ? "bg-paper text-ink shadow-sm"
            : "text-ink-faint hover:text-ink-soft"
        }`}
      >
        {t("remoteSource", { defaultValue: "远程" })}
      </button>
    </div>
  );
}
