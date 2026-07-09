// FreeNode 前端 API 对接层
// 把原来构建期读文件的逻辑换成运行期 fetch 后端 FastAPI

// 类型从 openapi-typescript 生成的 api-types.ts 里取，别再手写一份，
// 不然后端 Pydantic schema 一改这边就容易漂移。
import type { components } from "./api-types";

type Schema<K extends keyof components["schemas"]> = components["schemas"][K];

// 后端 NodeOut
export type Node = Schema<"NodeOut">;
// NodeDetail 后端是 NodeOut 的子类，生成时被拍平成全字段，结构上仍是 Node 的超集
export type NodeDetail = Schema<"NodeDetail">;
// 后端叫 SourceOut，前端别名回 Source 保持调用方不动
export type Source = Schema<"SourceOut">;
export type GlobalStats = Schema<"GlobalStats">;
export type ProtocolStat = Schema<"ProtocolStat">;
export type RegionStat = Schema<"RegionStat">;
// 后端 schema 名是 HealthOut，不是 Health
export type Health = Schema<"HealthOut">;
export type FiltersResponse = Schema<"FiltersResponse">;
export type FilterOption = Schema<"FilterOption">;

// 后端 PaginatedResponse 是泛型，openapi-typescript 只生成了具名实例
// PaginatedResponse_NodeOut_。前端目前只对 Node 分页，用条件类型兜一下，
// 以后要别的类型分页再扩。
export type PaginatedResponse<T> = T extends Node
  ? Schema<"PaginatedResponse_NodeOut_">
  : never;

// NodeCheck 后端返回的是裸 dict（list[dict]），没对应 schema，手写保留
export interface NodeCheck {
  checked_at: string | null;
  is_alive: boolean;
  latency_ms: number | null;
  fail_reason: string | null;
}

// --------------------------------------------------------------------------- //
// baseURL 解析
// 服务端走 API_BASE_URL（仅服务端可见）；客户端走 NEXT_PUBLIC_API_BASE_URL 或同源 /api
// --------------------------------------------------------------------------- //

function getBaseURL(): string {
  if (typeof window === "undefined") {
    // 服务端：直连后端
    return process.env.API_BASE_URL || "http://localhost:8000";
  }
  // 客户端：用公开 base，留空则走同源 /api（由 Next rewrites 或 Caddy 反代）
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  const base = getBaseURL();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}/api${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

// 统一的 fetch 包装：失败返回 null，不让页面崩
async function apiFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<T | null> {
  const url = buildUrl(endpoint, params);
  try {
    const init: RequestInit & { next?: { revalidate?: number } } = {};
    // 仅服务端加 revalidate，客户端用默认行为
    if (typeof window === "undefined") {
      init.next = { revalidate: 60 };
    }
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------- //
// 对外函数
// --------------------------------------------------------------------------- //

// 全局统计
export async function fetchStats(): Promise<GlobalStats | null> {
  return apiFetch<GlobalStats>("/stats");
}

// 协议分布
export async function fetchProtocols(): Promise<ProtocolStat[]> {
  const data = await apiFetch<ProtocolStat[]>("/stats/protocols");
  return data ?? [];
}

// 地区分布
export async function fetchRegions(limit = 50): Promise<RegionStat[]> {
  const data = await apiFetch<RegionStat[]>("/stats/regions", { limit });
  return data ?? [];
}

export interface NodeQuery {
  // 协议筛选，可传逗号分隔多值（如 "vmess,ss"），后端按多值匹配
  protocol?: string;
  // 地区筛选，可传逗号分隔多值，后端按多值匹配
  region?: string;
  alive?: boolean;
  max_latency?: number;
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "updated" | "latency" | "newest";
}

// 节点列表（分页）
export async function fetchNodes(
  query: NodeQuery = {}
): Promise<PaginatedResponse<Node>> {
  const data = await apiFetch<PaginatedResponse<Node>>("/nodes", {
    protocol: query.protocol,
    region: query.region,
    alive: query.alive,
    max_latency: query.max_latency,
    q: query.q,
    limit: query.limit,
    offset: query.offset,
    sort: query.sort,
  });
  if (!data) {
    return { items: [], total: 0, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }
  return data;
}

// 单个节点详情
export async function fetchNodeDetail(id: number): Promise<NodeDetail | null> {
  return apiFetch<NodeDetail>(`/nodes/${id}`);
}

// 节点筛选选项（带计数）
export async function fetchFilters(): Promise<FiltersResponse | null> {
  return apiFetch<FiltersResponse>("/nodes/filters");
}

// 节点检查历史
export async function fetchNodeHistory(id: number, limit = 50): Promise<NodeCheck[]> {
  const data = await apiFetch<NodeCheck[]>(`/nodes/${id}/history`, { limit });
  return data ?? [];
}

// 数据源列表
export async function fetchSources(
  enabled?: boolean,
  category?: string
): Promise<Source[]> {
  const data = await apiFetch<Source[]>("/sources", {
    enabled,
    category,
  });
  return data ?? [];
}

// 健康检查
export async function fetchHealth(): Promise<Health | null> {
  return apiFetch<Health>("/health");
}

export type SubscriptionFormat = "clash" | "v2ray" | "plain";

export interface SubscriptionOptions {
  protocol?: string;
  region?: string;
  alive?: boolean;
  limit?: number;
}

// 生成订阅链接（同步，只拼字符串）
export function getSubscriptionUrl(
  format: SubscriptionFormat,
  options: SubscriptionOptions = {}
): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${base}/api/subscriptions/${format}`;
  const params = new URLSearchParams();
  if (options.protocol) params.append("protocol", options.protocol);
  if (options.region) params.append("region", options.region);
  if (options.alive !== undefined) params.append("alive", String(options.alive));
  if (options.limit !== undefined) params.append("limit", String(options.limit));
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}
