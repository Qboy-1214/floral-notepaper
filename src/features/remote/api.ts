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
