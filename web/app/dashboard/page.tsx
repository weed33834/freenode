"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  BarChart3,
  Globe,
  LogIn,
  LogOut,
  Server,
  Database,
  Workflow,
} from "lucide-react";
import {
  getMetrics,
  getTrend,
  type MetricsResponse,
  type TrendPoint,
  type TrendResponse,
} from "@/lib/admin-api";
import { useAuth, setAdminKey, clearAdminKey } from "@/lib/auth-store";

export default function DashboardPage() {
  const authed = useAuth();
  const [keyInput, setKeyInput] = useState("");

  const handleLogin = () => {
    const key = keyInput.trim();
    if (!key) return;
    setAdminKey(key);
    setKeyInput("");
  };

  const handleLogout = () => {
    clearAdminKey();
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-semibold mb-2">仪表盘</h1>
        <p className="text-sm text-muted mb-6">
          输入管理 API Key 登录。管理后台和仪表盘共用同一个 Key。
        </p>
        <div className="border border-border bg-surface p-5 space-y-3">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="输入管理 API Key"
            aria-label="管理 API Key"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLogin}
              disabled={!keyInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" /> 登录
            </button>
            <button
              type="button"
              onClick={() => setKeyInput("")}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">仪表盘</h1>
          <p className="text-sm text-muted">节点池与流水线的实时概览。</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" /> 退出
        </button>
      </div>

      <DashboardBody />
    </div>
  );
}

function DashboardBody() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, t] = await Promise.all([getMetrics(), getTrend()]);
      setMetrics(m);
      setTrend(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-sm font-medium text-muted">数据概览</h2>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新数据
        </button>
      </div>

      {error && (
        <div className="border border-danger/30 bg-danger/10 p-3 text-xs text-danger mb-6">
          {error}
        </div>
      )}

      {loading && !metrics ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          <OverviewCards metrics={metrics} />
          <TrendSection trend={trend} loading={loading} />
          <ProtocolSection
            protocols={metrics.nodes.by_protocol}
            total={metrics.nodes.total}
          />
          <RegionSection
            regions={metrics.nodes.by_region_top5}
            total={metrics.nodes.total}
          />
        </div>
      ) : null}
    </>
  );
}

function OverviewCards({ metrics }: { metrics: MetricsResponse }) {
  const pipeline = metrics.last_pipeline;

  let pipelineStatus: ReactNode;
  if (!pipeline) {
    pipelineStatus = <span className="text-muted">暂无记录</span>;
  } else if (pipeline.status === "completed") {
    pipelineStatus = (
      <span className="inline-flex items-center gap-1.5 text-success font-medium">
        <CheckCircle className="w-4 h-4" /> 完成
      </span>
    );
  } else if (pipeline.status === "failed") {
    pipelineStatus = (
      <span className="inline-flex items-center gap-1.5 text-danger font-medium">
        <XCircle className="w-4 h-4" /> 失败
      </span>
    );
  } else {
    pipelineStatus = <span className="text-warning">{pipeline.status}</span>;
  }

  const cards: {
    label: string;
    value: ReactNode;
    icon: typeof Server;
    hint?: string;
  }[] = [
    { label: "节点总数", value: metrics.nodes.total, icon: Server },
    { label: "存活节点", value: metrics.nodes.alive, icon: Activity },
    {
      label: "数据源（启用/总数）",
      value: `${metrics.sources.enabled}/${metrics.sources.total}`,
      icon: Database,
    },
    {
      label: "最近流水线",
      value: pipelineStatus,
      icon: Workflow,
      hint: pipeline?.finished_at
        ? new Date(pipeline.finished_at).toLocaleString("zh-CN")
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="border border-border bg-surface p-4">
            <Icon className="w-4 h-4 text-muted mb-3" />
            <div className="text-xl font-semibold font-mono mb-0.5">
              {card.value}
            </div>
            <div className="text-xs text-muted">{card.label}</div>
            {card.hint && (
              <div className="mt-2 text-[10px] text-muted leading-relaxed">
                {card.hint}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrendSection({
  trend,
  loading,
}: {
  trend: TrendResponse | null;
  loading: boolean;
}) {
  const days = trend?.days ?? [];
  const hasData = days.length > 0;
  return (
    <section className="border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="font-medium text-sm">存活趋势（最近 7 天）</h2>
      </div>
      {hasData ? (
        <TrendChart days={days} />
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted py-12">
          <Loader2 className="w-4 h-4 text-primary animate-spin" /> 加载中...
        </div>
      ) : (
        <p className="text-center text-muted text-sm py-12">
          暂无趋势数据（运行几次流水线后会有）
        </p>
      )}
      {hasData && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 border-t-2 border-primary" />
            存活
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 border-t-2 border-dashed border-muted" />
            检查总数
          </span>
        </div>
      )}
    </section>
  );
}

function TrendChart({ days }: { days: TrendPoint[] }) {
  const W = 600;
  const H = 200;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxVal = Math.max(...days.map((d) => Math.max(d.checked, d.alive)), 1);
  const n = days.length;
  // 单点放中间，多点均匀分布，避免除零
  const xOf = (i: number) =>
    padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (v: number) => padT + plotH - (v / maxVal) * plotH;

  const checkedPts = days
    .map((d, i) => `${xOf(i)},${yOf(d.checked)}`)
    .join(" ");
  const alivePts = days
    .map((d, i) => `${xOf(i)},${yOf(d.alive)}`)
    .join(" ");
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="存活趋势折线图"
    >
      {yTicks.map((t) => {
        const y = yOf(t);
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="rgba(200,200,215,0.12)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#b8b8c8"
            >
              {t}
            </text>
          </g>
        );
      })}
      <polyline
        points={checkedPts}
        fill="none"
        stroke="#b8b8c8"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <polyline
        points={alivePts}
        fill="none"
        stroke="#f5a623"
        strokeWidth={2}
      />
      {days.map((d, i) => (
        <g key={d.date}>
          <circle cx={xOf(i)} cy={yOf(d.checked)} r={2} fill="#b8b8c8" />
          <circle cx={xOf(i)} cy={yOf(d.alive)} r={3} fill="#f5a623" />
        </g>
      ))}
      {days.map((d, i) => (
        <text
          key={d.date}
          x={xOf(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize={10}
          fill="#b8b8c8"
        >
          {d.date.length >= 10 ? d.date.slice(5, 10) : d.date}
        </text>
      ))}
    </svg>
  );
}

function ProtocolSection({
  protocols,
  total,
}: {
  protocols: Record<string, number>;
  total: number;
}) {
  const items = Object.entries(protocols)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({ label, count }));
  return (
    <section className="border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="font-medium text-sm">协议分布</h2>
      </div>
      <DistributionBars items={items} total={total} emptyText="暂无协议数据" />
    </section>
  );
}

function RegionSection({
  regions,
  total,
}: {
  regions: { region: string; count: number }[];
  total: number;
}) {
  const items = regions
    .filter((r) => r.count > 0)
    .map((r) => ({ label: r.region, count: r.count }));
  return (
    <section className="border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-primary" />
        <h2 className="font-medium text-sm">地区分布 Top5</h2>
      </div>
      <DistributionBars items={items} total={total} emptyText="暂无地区数据" />
    </section>
  );
}

function DistributionBars({
  items,
  total,
  emptyText,
}: {
  items: { label: string; count: number }[];
  total: number;
  emptyText: string;
}) {
  if (items.length === 0 || total === 0) {
    return <p className="text-xs text-muted">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-xs">
          <span
            className="w-24 shrink-0 font-mono uppercase truncate"
            title={item.label}
          >
            {item.label}
          </span>
          <div className="flex-1 h-2 bg-background border border-border overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right font-mono">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
