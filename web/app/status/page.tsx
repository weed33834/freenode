import type { Metadata } from "next";
import Link from "next/link";
import { fetchHealth, fetchStats, fetchProtocols, fetchRegions } from "@/lib/api";

export const metadata: Metadata = {
  title: "运行状态 — FreeNode",
  description:
    "查看 FreeNode 最近一次构建的节点数量、验证通过率、平均延迟、协议覆盖与地区分布。",
};
import { ProtocolChart } from "@/components/protocol-chart";
import { StatCard } from "@/components/stat-card";
import { DistributionBars } from "@/components/distribution-bars";
import {
  Clock,
  Server,
  Database,
  Globe,
  Activity,
  Workflow,
  Shield,
  Zap,
  MapPin,
  Signal,
  Gauge,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default async function StatusPage() {
  // 以 health 为主，配合 stats / protocols / regions 补齐其余字段
  const [health, statsData, protocols, regions] = await Promise.all([
    fetchHealth(),
    fetchStats(),
    fetchProtocols(),
    fetchRegions(),
  ]);

  const protocolCounts: Record<string, number> = {};
  for (const p of protocols) protocolCounts[p.protocol] = p.total;

  const regionMap: Record<string, number> = {};
  for (const r of regions) regionMap[r.region] = r.total;

  const lastUpdatedRaw = statsData?.last_updated ?? health?.last_updated ?? null;
  const lastUpdated = lastUpdatedRaw
    ? new Date(lastUpdatedRaw).toLocaleString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "未知";

  // 新后端不再单独维护 proxies.txt，代理池数量用节点总数代替
  const totalNodes = statsData?.total_nodes ?? health?.total_nodes ?? 0;

  const stats = {
    lastUpdated,
    nodeCount: totalNodes,
    proxyCount: totalNodes,
    enabledSources: statsData?.enabled_sources ?? 0,
    totalSources: statsData?.total_sources ?? 0,
    protocolCounts,
    regions: regionMap,
    actionsStatus: "每日自动运行（UTC 02:00）",
  };

  const quality = statsData
    ? {
        total: statsData.total_nodes,
        alive: statsData.alive_nodes,
        survivalRate: statsData.survival_rate,
        avgLatency: statsData.avg_latency_ms ?? 0,
      }
    : null;

  const topRegions = regions
    .filter((r) => r.total > 0)
    .slice(0, 3)
    .map((r) => ({ region: r.region, count: r.total }));

  const protocolTotal = Object.values(stats.protocolCounts).reduce(
    (sum, v) => sum + v,
    0
  );

  const regionEntries = Object.entries(stats.regions)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxRegionCount = Math.max(
    ...regionEntries.map(([, count]) => count),
    1
  );

  const cards = [
    {
      label: "最后更新时间",
      value: stats.lastUpdated,
      icon: Clock,
      hint: "基于 nodes/clash.yaml 文件修改时间",
    },
    {
      label: "当前节点总数",
      value: stats.nodeCount.toString(),
      icon: Server,
      hint: "MAX_NODES 限制后的 Clash 节点数量",
    },
    {
      label: "代理池数量",
      value: stats.proxyCount.toString(),
      icon: Globe,
      hint: "nodes/proxies.txt 中的公开代理数量",
    },
    {
      label: "启用数据源",
      value: `${stats.enabledSources}/${stats.totalSources}`,
      icon: Database,
      hint: "config/sources.json 中 enabled=true 的源",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Activity className="w-3.5 h-3.5" />
          STATUS
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">运行状态</h1>
        <p className="text-sm text-muted max-w-2xl">
          以下数据在构建时从静态文件读取，反映最近一次成功生成后的状态。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <StatCard
              key={card.label}
              value={card.value}
              label={card.label}
              icon={Icon}
              hint={card.hint}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Signal}
          value={quality ? `${quality.survivalRate.toFixed(1)}%` : "未启用"}
          label="验证通过率"
          hint={
            quality
              ? `${quality.alive}/${quality.total} 个节点通过 TCP 校验`
              : "本次生成未启用验证，可在本地运行 --verify 启用"
          }
        />
        <StatCard
          icon={Gauge}
          value={quality ? `${quality.avgLatency.toFixed(0)} ms` : "未启用"}
          label="平均延迟"
          hint={quality ? "通过验证节点的平均延迟" : "未启用验证时无延迟数据"}
        />
        <StatCard
          icon={TrendingUp}
          value={
            topRegions.length > 0
              ? topRegions.map((r) => r.region.toUpperCase()).join(" / ")
              : "暂无数据"
          }
          label="地区 TOP3"
          hint={
            topRegions.length > 0
              ? topRegions.map((r) => `${r.region.toUpperCase()}: ${r.count}`).join(" · ")
              : "未生成地区分布数据"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ProtocolChart counts={stats.protocolCounts} />
        </div>
        <div className="space-y-4">
          <div className="border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Workflow className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">GitHub Actions</h2>
            </div>
            <div className="text-xs text-muted leading-relaxed mb-3">
              {stats.actionsStatus}
            </div>
            <div className="flex items-center gap-2 text-xs text-success">
              <span className="w-2 h-2 bg-success" />
              定时任务已启用
            </div>
          </div>

          <div className="border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">验证说明</h2>
            </div>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>· CI 每日默认启用 TCP 连通性校验。</li>
              <li>· 本地可运行 --verify 获得更严格筛选。</li>
              <li>· 节点可用性受用户网络环境影响。</li>
            </ul>
          </div>

          <div className="border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">协议覆盖</h2>
            </div>
            <div className="text-2xl font-semibold font-mono mb-1">
              {Object.keys(stats.protocolCounts).length}
            </div>
            <div className="text-[10px] text-muted">
              已识别协议 / {protocolTotal} 个已分类节点
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-medium text-sm">节点地区分布</h2>
        </div>
        {regionEntries.length === 0 ? (
          <p className="text-xs text-muted">
            地区数据暂未生成，可在本地启用 FREENODE_GEO_ENABLED=true 生成
          </p>
        ) : (
          <DistributionBars
            items={regionEntries.map(([label, count]) => ({ label, count }))}
            total={maxRegionCount}
            emptyText="暂无地区数据"
            countWidth="w-10"
          />
        )}
      </div>

      <div className="border border-border bg-surface p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-primary" />
          <h2 className="font-medium text-sm">质量说明</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-muted leading-relaxed">
          <div>
            <h3 className="font-medium text-foreground mb-1">验证流程</h3>
            <p className="mb-3">
              生成 clash.yaml 时，脚本会对节点进行 TCP 连通性校验。通过校验的节点会被保留，并统计通过率与平均延迟。
            </p>
            <p>
              GitHub Actions 默认每日运行一次；本地可使用 --verify 参数获得更严格的筛选结果。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">为什么可用性会变化</h3>
            <p className="mb-3">
              免费节点来自公开渠道，服务器负载、网络抖动、IP 封锁都会影响可用性。同一节点在不同地区、不同运营商的表现也可能不同。
            </p>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover transition-colors"
            >
              查看测速方法 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="border border-warning/20 bg-warning/10 p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-warning shrink-0" />
        <div>
          <h3 className="font-medium text-warning text-sm mb-1">状态说明</h3>
          <p className="text-xs text-muted leading-relaxed">
            本页面为静态生成，展示的是构建时刻的快照。实际节点可用性会随时间变化，建议每日重新导入订阅或等待 GitHub Actions 自动更新。
          </p>
        </div>
      </div>
    </div>
  );
}
