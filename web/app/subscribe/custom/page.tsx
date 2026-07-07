"use client";

import { useEffect, useState } from "react";
import {
  getSubscriptionUrl,
  fetchFilters,
  type SubscriptionFormat,
  type FilterOption,
} from "@/lib/api";
import { CopyButton } from "@/components/copy-button";

const FORMAT_OPTIONS: { value: SubscriptionFormat; label: string; desc: string }[] = [
  { value: "clash", label: "Clash", desc: "Clash 内核客户端" },
  { value: "v2ray", label: "V2Ray", desc: "v2rayN/v2rayNG/Shadowrocket" },
  { value: "plain", label: "Plain", desc: "HTTP/SOCKS 代理列表" },
];

export default function CustomSubscribePage() {
  const [format, setFormat] = useState<SubscriptionFormat>("clash");
  const [protocol, setProtocol] = useState("");
  const [region, setRegion] = useState("");
  const [alive, setAlive] = useState(true);
  const [limitInput, setLimitInput] = useState("200");
  const [protocols, setProtocols] = useState<FilterOption[]>([]);
  const [regions, setRegions] = useState<FilterOption[]>([]);

  useEffect(() => {
    fetchFilters().then((f) => {
      if (!f) return;
      setProtocols(f.protocols);
      setRegions(f.regions);
    });
  }, []);

  const isPlain = format === "plain";
  const limitRaw = parseInt(limitInput, 10);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(2000, limitRaw) : 200;

  const url = getSubscriptionUrl(format, {
    protocol: isPlain ? undefined : protocol,
    region: isPlain ? undefined : region,
    alive,
    limit,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">自定义订阅</h1>
        <p className="text-sm text-muted">
          按格式、协议、地区、可用性和数量生成订阅链接，复制后导入客户端即可。
        </p>
      </div>

      <div className="border border-border bg-surface p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">格式</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as SubscriptionFormat)}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">数量上限</label>
            <input
              type="number"
              min={1}
              max={2000}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={() => {
                const v = parseInt(limitInput, 10);
                if (!Number.isFinite(v) || v < 1) setLimitInput("1");
                else if (v > 2000) setLimitInput("2000");
              }}
              aria-label="数量上限"
              className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <p className="text-[10px] text-muted mt-1">范围 1 - 2000，默认 200</p>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">协议</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              disabled={isPlain}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">全部</option>
              {protocols.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.value.toUpperCase()} ({p.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">地区</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isPlain}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">全部</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value.toUpperCase()} ({r.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isPlain && (
          <p className="text-[11px] text-warning mt-3">
            plain 格式不支持协议/地区筛选，仅按可用性和数量生成。
          </p>
        )}

        <label className="flex items-center gap-2 mt-4 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={alive}
            onChange={(e) => setAlive(e.target.checked)}
            className="accent-primary"
          />
          仅包含可用节点
        </label>
      </div>

      <div className="border border-border bg-surface p-5 mb-6">
        <label className="block text-xs text-muted mb-2">订阅链接</label>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={url}
            aria-label="订阅链接"
            className="flex-1 min-w-0 bg-background border border-border px-3 py-2 text-[11px] font-mono text-muted truncate focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <CopyButton text={url} label="复制链接" />
        </div>
        <p className="text-[10px] text-muted mt-2">
          链接随选项实时更新，无需手动点生成。
        </p>
      </div>

      <div className="border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold mb-3">格式说明</h2>
        <ul className="space-y-1.5 text-xs text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            Clash：YAML 配置，适合 Clash Verge / Clash Meta 等内核客户端，支持规则分流。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            V2Ray：Base64 编码的节点链接集合，适合 v2rayN / v2rayNG / Shadowrocket 等。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            Plain：纯文本代理列表，每行一个，适合浏览器扩展、curl、爬虫按需取用，不能按协议/地区过滤。
          </li>
        </ul>
      </div>
    </div>
  );
}
