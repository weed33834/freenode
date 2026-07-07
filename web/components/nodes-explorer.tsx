"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";
import { fetchNodes, type Node, type NodeQuery } from "@/lib/api";

const PAGE_SIZE = 20;

interface NodesExplorerProps {
  initialNodes: Node[];
  initialTotal: number;
  protocols: string[];
  regions: string[];
}

export function NodesExplorer({
  initialNodes,
  initialTotal,
  protocols,
  regions,
}: NodesExplorerProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [total, setTotal] = useState(initialTotal);
  const [protocol, setProtocol] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [aliveOnly, setAliveOnly] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<"updated" | "latency" | "newest">("updated");
  const [loading, setLoading] = useState(false);

  // 搜索做一点防抖，避免每键都打后端
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const reload = useCallback(async () => {
    setLoading(true);
    const params: NodeQuery = { limit: PAGE_SIZE, offset, sort };
    if (protocol) params.protocol = protocol;
    if (region) params.region = region;
    if (query) params.q = query;
    if (aliveOnly) params.alive = true;
    const res = await fetchNodes(params);
    setNodes(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [protocol, region, query, aliveOnly, offset, sort]);

  useEffect(() => {
    reload();
  }, [reload]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="border border-border bg-surface">
      {/* 筛选区 */}
      <div className="px-4 py-3 border-b border-border flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <h3 className="font-medium text-sm">筛选节点</h3>
          <span className="text-xs text-muted ml-auto font-mono">
            共 {total} 个
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索备注或地区"
              aria-label="搜索节点"
              className="w-full bg-background border border-border pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <select
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value);
              setOffset(0);
            }}
            aria-label="按协议筛选"
            className="border border-border bg-background px-2.5 py-1.5 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">所有协议</option>
            {protocols.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setOffset(0);
            }}
            aria-label="按地区筛选"
            className="border border-border bg-background px-2.5 py-1.5 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">所有地区</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "updated" | "latency" | "newest");
              setOffset(0);
            }}
            aria-label="排序方式"
            className="border border-border bg-background px-2.5 py-1.5 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="updated">最近更新</option>
            <option value="latency">延迟最低</option>
            <option value="newest">最新收录</option>
          </select>
          <button
            type="button"
            aria-pressed={aliveOnly}
            onClick={() => {
              setAliveOnly((v) => !v);
              setOffset(0);
            }}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              aliveOnly
                ? "border-success/30 text-success bg-success/10"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            仅看可用
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}
        <table className="w-full text-xs text-left">
          <thead className="bg-background text-muted border-b border-border">
            <tr>
              <th className="px-4 py-2.5 font-medium">协议</th>
              <th className="px-4 py-2.5 font-medium">备注</th>
              <th className="px-4 py-2.5 font-medium">地区</th>
              <th className="px-4 py-2.5 font-medium">来源</th>
              <th className="px-4 py-2.5 font-medium">延迟</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {nodes.map((node) => (
              <tr
                key={node.id}
                onClick={() => router.push(`/nodes/${node.id}`)}
                className="cursor-pointer hover:bg-surface-hover/50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted uppercase">
                    {node.protocol}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="truncate max-w-xs" title={node.remark}>
                    {node.remark || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-muted uppercase">
                  {node.region || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div
                    className="truncate max-w-[120px] text-muted"
                    title={node.source_name}
                  >
                    {node.source_name || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-muted">
                  {node.last_latency_ms != null
                    ? `${node.last_latency_ms} ms`
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {node.is_alive ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium px-1.5 py-0.5 border border-success/20">
                      可用
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-xs font-medium px-1.5 py-0.5 border border-border">
                      失效
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {nodes.length === 0 && !loading && (
          <div className="p-6 text-center text-muted text-xs">
            没有符合条件的节点
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
        <span className="text-xs text-muted font-mono">
          第 {currentPage} / {pageCount} 页
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 上一页
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!canNext}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一页 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
