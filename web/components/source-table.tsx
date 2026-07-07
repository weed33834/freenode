"use client";

import { useState } from "react";
import { Check, ExternalLink, X, Filter } from "lucide-react";

interface Source {
  name: string;
  type: string;
  url: string;
  enabled: boolean;
  decode_base64?: boolean;
  note?: string;
  update_interval?: string;
  protocols?: string[];
}

interface SourceTableProps {
  sources: Source[];
}

// 安全检查：只允许 http(s) 协议的 URL 作为外链。
// 防止 javascript:/data:/vbscript: 等伪协议通过 source.url 触发 XSS。
function isSafeUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  // 用 try 防御 URL 构造抛错；显式判断 protocol 字段而不是 startsWith，
  // 避免 " javascript:..." 这种前导空格绕过。
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function SourceTable({ sources }: SourceTableProps) {
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | string>("all");
  const [protocolFilter, setProtocolFilter] = useState<"all" | string>("all");

  const types = Array.from(new Set(sources.map((s) => s.type)));
  const protocols = Array.from(new Set(sources.flatMap((s) => s.protocols || []))).sort();

  const filtered = sources
    .filter((s) => {
      if (filter === "enabled") return s.enabled;
      if (filter === "disabled") return !s.enabled;
      return true;
    })
    .filter((s) => {
      if (typeFilter === "all") return true;
      return s.type === typeFilter;
    })
    .filter((s) => {
      if (protocolFilter === "all") return true;
      return (s.protocols || []).includes(protocolFilter);
    });

  return (
    <div className="border border-border bg-surface">
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted" />
            数据源列表
          </h3>
          <p className="text-xs text-muted mt-0.5">
            共 {sources.length} 个源，已启用 {sources.filter((s) => s.enabled).length} 个
            {protocolFilter !== "all" && `，符合协议 ${protocolFilter.toUpperCase()} 的有 ${filtered.length} 个`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex border border-border p-0.5">
            {(["all", "enabled", "disabled"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  filter === key
                    ? "bg-surface-hover text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {key === "all" ? "全部" : key === "enabled" ? "已启用" : "已禁用"}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="按类型筛选数据源"
            className="border border-border bg-background px-2.5 py-1 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="all">所有类型</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            aria-label="按协议筛选数据源"
            className="border border-border bg-background px-2.5 py-1 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="all">所有协议</option>
            {protocols.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-background text-muted border-b border-border">
            <tr>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">名称</th>
              <th className="px-4 py-2.5 font-medium">类型</th>
              <th className="px-4 py-2.5 font-medium">更新频率</th>
              <th className="px-4 py-2.5 font-medium">协议</th>
              <th className="px-4 py-2.5 font-medium">说明</th>
              <th className="px-4 py-2.5 font-medium">链接</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((source) => (
              <tr key={source.name} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-2.5">
                  {source.enabled ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium px-1.5 py-0.5 border border-success/20">
                      <Check className="w-3 h-3" /> 启用
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-xs font-medium px-1.5 py-0.5 border border-border">
                      <X className="w-3 h-3" /> 禁用
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-medium">{source.name}</td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs px-1.5 py-0.5 border border-border">
                    {source.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted">
                  {source.update_interval || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(source.protocols || []).slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="font-mono text-[10px] px-1 py-0.5 border border-border text-muted"
                      >
                        {p.toUpperCase()}
                      </span>
                    ))}
                    {(source.protocols || []).length > 3 && (
                      <span className="text-[10px] px-1 py-0.5 border border-border text-muted">
                        +{(source.protocols || []).length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted max-w-xs">
                  <div className="truncate" title={source.note}>
                    {source.note || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {isSafeUrl(source.url) ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
                    >
                      查看 <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="p-6 text-center text-muted text-xs">
          没有符合条件的数据源
        </div>
      )}
    </div>
  );
}
