// 管理后台 API 调用层
// key 只存 localStorage，请求带 X-API-Key，只走同源

import type { Source } from "./api";

const ADMIN_KEY_STORAGE = "freenode_admin_key";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  else localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function isAuthed(): boolean {
  return !!getAdminKey();
}

export interface TaskStatus {
  task_id: string;
  status: "running" | "completed" | "failed";
  started_at?: string;
  finished_at?: string;
  error?: string;
  node_sources?: number;
  total_links?: number;
  alive_nodes?: number;
  upserted?: number;
  elapsed_seconds?: number;
}

export interface RefreshResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface DeleteNodeResponse {
  id: number;
  deleted: boolean;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

function authHeaders(): Record<string, string> {
  return {
    "X-API-Key": getAdminKey(),
    "Content-Type": "application/json",
  };
}

// 统一请求：失败抛错，调用方处理
async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBase()}/api/admin${path}`;
  const res = await fetch(url, {
    method: init?.method,
    body: init?.body,
    headers: authHeaders(),
  });
  if (!res.ok) {
    let detail = `请求失败：HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: unknown; message?: string };
      if (typeof body.message === "string" && body.message) detail = body.message;
      else if (typeof body.detail === "string" && body.detail) detail = body.detail;
    } catch {
      // 非 JSON 响应，忽略
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export function triggerRefresh(verify: boolean): Promise<RefreshResponse> {
  return adminFetch<RefreshResponse>("/refresh", {
    method: "POST",
    body: JSON.stringify({ verify }),
  });
}

export function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return adminFetch<TaskStatus>(`/tasks/${encodeURIComponent(taskId)}`);
}

export function deleteNode(id: number): Promise<DeleteNodeResponse> {
  return adminFetch<DeleteNodeResponse>(`/nodes/${id}`, { method: "DELETE" });
}

export function updateSource(id: number, fields: {
  name?: string;
  url?: string;
  category?: string;
  enabled?: boolean;
  decode_base64?: boolean;
  proxy_scheme?: string;
}): Promise<Source> {
  return adminFetch<Source>(`/sources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function createSource(data: {
  name: string;
  url: string;
  category?: string;
  source_type?: string;
  enabled?: boolean;
  decode_base64?: boolean;
  proxy_scheme?: string;
}): Promise<Source> {
  return adminFetch<Source>("/sources", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteSource(id: number): Promise<{ id: number; deleted: boolean }> {
  return adminFetch<{ id: number; deleted: boolean }>(`/sources/${id}`, {
    method: "DELETE",
  });
}

export interface MetricsResponse {
  nodes: {
    total: number;
    alive: number;
    by_protocol: Record<string, number>;
    by_region_top5: { region: string; count: number }[];
  };
  sources: { total: number; enabled: number };
  last_pipeline: {
    status: string;
    finished_at: string;
    alive_nodes: number | null;
  } | null;
}

export interface TrendPoint {
  date: string;
  checked: number;
  alive: number;
}

export interface TrendResponse {
  days: TrendPoint[];
}

export interface SourceFetchLog {
  id: number;
  source_id: number | null;
  source_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  raw_count: number;
  parsed_count: number;
  new_count: number;
  error: string | null;
  duration_ms: number | null;
}

export function getMetrics(): Promise<MetricsResponse> {
  return adminFetch<MetricsResponse>("/metrics");
}

export function getTrend(): Promise<TrendResponse> {
  return adminFetch<TrendResponse>("/metrics/trend");
}

export function getSourceLogs(sourceId: number, limit = 20): Promise<SourceFetchLog[]> {
  return adminFetch<SourceFetchLog[]>(`/sources/${sourceId}/logs?limit=${limit}`);
}
