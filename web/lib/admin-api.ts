// 管理后台 API 调用层
// 登录态由 auth-store.ts 统一管理（setAdminKey / clearAdminKey / useAuth），
// 请求带 X-API-Key（见下方 authHeaders），只走同源

import type { components } from "./api-types";
import type { Source } from "./api";
import { getAdminKey } from "./auth-store";

type Schema<K extends keyof components["schemas"]> = components["schemas"][K];

// GET /tasks/{id} 后端返回裸 dict（无 schema），手写保留
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

// POST /refresh 返回 TaskResponse，复用生成类型避免手写结构漂移
export type RefreshResponse = Schema<"TaskResponse">;

// DELETE /nodes/{id} 后端返回裸 dict（无 schema），手写保留
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

// 复用后端 schema，避免手写结构漂移
export type MetricsResponse = Schema<"MetricsResponse">;
export type TrendPoint = Schema<"TrendPoint">;
export type TrendResponse = Schema<"TrendResponse">;

export function getMetrics(): Promise<MetricsResponse> {
  return adminFetch<MetricsResponse>("/metrics");
}

export function getTrend(): Promise<TrendResponse> {
  return adminFetch<TrendResponse>("/metrics/trend");
}
