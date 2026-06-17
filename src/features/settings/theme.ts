import { getThemeById } from "../themes";
import type { ThemeOption } from "./types";

function applyThemeColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }
}

function resolveTheme(option: ThemeOption): string {
  if (option === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  // 如果 option 是已知主题 id，直接使用；否则 fallback 到 light
  const theme = getThemeById(option);
  if (theme) return option;
  // 兼容旧的 "light" / "dark" 字面量
  if (option === "light" || option === "dark") return option;
  return "light";
}

export function applyTheme(option: ThemeOption): void {
  const root = document.documentElement;
  const resolved = resolveTheme(option);
  const theme = getThemeById(resolved);

  if (theme) {
    applyThemeColors(theme.colors);
  }

  localStorage.setItem("theme-option", option);
  localStorage.setItem("theme-resolved", resolved);

  if (root.getAttribute("data-theme") !== resolved) {
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", resolved);
    setTimeout(() => root.classList.remove("theme-transition"), 400);
  }
}

let systemListener: (() => void) | null = null;

export function watchSystemTheme(option: ThemeOption): () => void {
  if (systemListener) {
    systemListener();
    systemListener = null;
  }

  if (option !== "system") return () => {};

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => applyTheme("system");
  mql.addEventListener("change", handler);

  const cleanup = () => {
    mql.removeEventListener("change", handler);
    systemListener = null;
  };
  systemListener = cleanup;
  return cleanup;
}
