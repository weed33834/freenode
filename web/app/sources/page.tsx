import type { Metadata } from "next";
import { fetchStats, fetchProtocols, fetchRegions, fetchSources } from "@/lib/api";

export const metadata: Metadata = {
  title: "数据源透明度 — FreeNode",
  description:
    "FreeNode 不生产节点，所有内容均来自公开数据源。查看数据源总数、协议覆盖、更新频率与地区分布。",
};
import { SourceTable } from "@/components/source-table";
import { ProtocolChart } from "@/components/protocol-chart";
import { RegionCloud } from "@/components/region-cloud";
import Link from "next/link";
import {
  Shield,
  Info,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Clock,
  PlusCircle,
  ExternalLink,
  MapPin,
  Activity,
  BadgeCheck,
  Layers,
} from "lucide-react";

export default async function SourcesPage() {
  // 并行拉取统计、协议、地区、数据源
  const [statsData, protocols, regions, sourceList] = await Promise.all([
    fetchStats(),
    fetchProtocols(),
    fetchRegions(),
    fetchSources(),
  ]);

  const protocolCounts: Record<string, number> = {};
  for (const p of protocols) protocolCounts[p.protocol] = p.total;

  const regionMap: Record<string, number> = {};
  for (const r of regions) regionMap[r.region] = r.total;

  // 后端 Source 字段和旧组件不完全一致，这里做一层映射
  const sources = sourceList.map((s) => ({
    name: s.name,
    type: s.source_type,
    url: s.url,
    enabled: s.enabled,
    decode_base64: s.decode_base64,
    note: s.last_error || s.last_fetch_status || undefined,
    update_interval: s.update_interval ?? undefined,
    protocols: s.protocols,
  }));

  const stats = {
    totalNodes: statsData?.total_nodes ?? 0,
    enabledSources: statsData?.enabled_sources ?? 0,
    totalSources: statsData?.total_sources ?? 0,
    protocolCounts,
    regions: regionMap,
    sources,
  };

  const activeSources = stats.enabledSources;
  const documentedSources = stats.sources.filter(
    (s) => s.enabled && s.update_interval
  ).length;
  const avgProtocolCoverage =
    stats.totalSources > 0
      ? (
          stats.sources.reduce((sum, s) => sum + (s.protocols?.length || 0), 0) /
          stats.totalSources
        ).toFixed(1)
      : "0";

  const intervalDistribution = Object.entries(
    stats.sources.reduce<Record<string, number>>(
      (acc, source) => {
        const key = source.update_interval || "未标注";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    )
  ).sort(([, a], [, b]) => b - a);

  const maxIntervalCount =
    intervalDistribution.length > 0
      ? Math.max(...intervalDistribution.map(([, count]) => count))
      : 0;

  // 协议覆盖列表：去重 + 排序，下面标签与计数复用同一份
  const coveredProtocols = Array.from(
    new Set(stats.sources.flatMap((s) => s.protocols || []))
  ).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">数据源透明度</h1>
        <p className="text-sm text-muted max-w-2xl">
          FreeNode 不生产节点，所有内容均来自以下公开数据源。我们尊重各源的 robots.txt 和服务条款。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="border border-border bg-surface p-4">
          <Database className="w-4 h-4 text-muted mb-2" />
          <div className="text-xl font-semibold font-mono">{stats.totalSources}</div>
          <div className="text-[10px] text-muted">数据源总数</div>
        </div>
        <div className="border border-border bg-surface p-4">
          <CheckCircle2 className="w-4 h-4 text-success mb-2" />
          <div className="text-xl font-semibold font-mono">{stats.enabledSources}</div>
          <div className="text-[10px] text-muted">已启用源</div>
        </div>
        <div className="border border-border bg-surface p-4">
          <RefreshCw className="w-4 h-4 text-secondary mb-2" />
          <div className="text-xl font-semibold font-mono">
            {Object.keys(stats.protocolCounts).length || 0}
          </div>
          <div className="text-[10px] text-muted">识别协议</div>
        </div>
        <div className="border border-border bg-surface p-4">
          <Shield className="w-4 h-4 text-warning mb-2" />
          <div className="text-xl font-semibold font-mono">{stats.totalNodes}</div>
          <div className="text-[10px] text-muted">当前节点数</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="border border-border bg-surface p-5">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            协议覆盖
          </h3>
          <div className="flex flex-wrap gap-2">
            {coveredProtocols.map((protocol) => (
              <span
                key={protocol}
                className="font-mono text-xs px-2 py-1 border border-border text-muted uppercase"
              >
                {protocol}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            当前数据源声明覆盖 {coveredProtocols.length} 种协议。
          </p>
        </div>

        <div className="border border-border bg-surface p-5">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            更新频率分布
          </h3>
          <div className="space-y-2">
            {intervalDistribution.map(([interval, count]) => (
              <div key={interval} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-muted">{interval}</span>
                    <div className="flex-1 h-2 bg-background border border-border overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / maxIntervalCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono">{count}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface p-5 mb-8">
        <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          地区覆盖
        </h3>
        <RegionCloud regions={stats.regions} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">数据源健康度</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-border bg-surface p-4">
            <Database className="w-4 h-4 text-muted mb-2" />
            <div className="text-xl font-semibold font-mono">{stats.totalSources}</div>
            <div className="text-[10px] text-muted">总收录源数量</div>
          </div>
          <div className="border border-border bg-surface p-4">
            <Activity className="w-4 h-4 text-success mb-2" />
            <div className="text-xl font-semibold font-mono">{activeSources}</div>
            <div className="text-[10px] text-muted">活跃源数量</div>
          </div>
          <div className="border border-border bg-surface p-4">
            <BadgeCheck className="w-4 h-4 text-primary mb-2" />
            <div className="text-xl font-semibold font-mono">{documentedSources}</div>
            <div className="text-[10px] text-muted">已标注更新源</div>
          </div>
          <div className="border border-border bg-surface p-4">
            <Layers className="w-4 h-4 text-secondary mb-2" />
            <div className="text-xl font-semibold font-mono">{avgProtocolCoverage}</div>
            <div className="text-[10px] text-muted">平均协议覆盖数</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <SourceTable sources={stats.sources} />
        </div>
        <div className="space-y-4">
          <ProtocolChart counts={stats.protocolCounts} />
          <div className="border border-border bg-surface p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              数据说明
            </h3>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>· 已启用源每天 02:00 UTC 自动抓取。</li>
              <li>· 大文件源默认禁用，避免拖慢流水线。</li>
              <li>· 失效源可在 GitHub Issues 中报告。</li>
              <li>· 新增源需经过维护者审核后合并。</li>
              <li>· 协议分布基于当前 Clash 配置文件解析。</li>
            </ul>
          </div>
          <div className="border border-border bg-surface p-4">
            <h3 className="font-medium text-sm mb-3">更新频率图例</h3>
            <div className="space-y-1.5 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success" />
                <span>每小时 / 持续更新</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-warning" />
                <span>每 12 小时 / 每日</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-muted" />
                <span>未标注 / 低频</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border border-border bg-surface p-5">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" />
            缺少你想要的源？
          </h3>
          <p className="text-xs text-muted leading-relaxed mb-4">
            如果你知道其他公开、持续更新的节点或代理源，欢迎通过 Issue 模板提交。审核通过后会加入每日自动抓取列表。
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-2">
            <a
              href="https://github.com/MS33834/freenode/issues/new?template=source_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-medium hover:bg-primary-hover transition-colors"
            >
              提交新数据源 <ExternalLink className="w-3 h-3" />
            </a>
            <Link
                href="/sources/guide"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium hover:bg-surface-hover transition-colors"
              >
                查看贡献指南
              </Link>
          </div>
        </div>
        <div className="border border-border bg-surface p-5">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            数据源质量说明
          </h3>
          <ul className="space-y-1.5 text-xs text-muted">
            <li>· 所有源默认每 24 小时抓取一次（部分高频率源每小时或每 5 分钟）。</li>
            <li>· 大文件源默认禁用，避免拖慢 CI；需要时可手动启用。</li>
            <li>· 节点经过去重、私有 IP 过滤，部分工作流还会进行连通性验证。</li>
            <li>· 公开源可能随时失效，数量波动属于正常现象。</li>
          </ul>
        </div>
      </div>

      <div className="border border-warning/20 bg-warning/10 p-4 flex items-start gap-3 mb-8">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        <div>
          <h3 className="font-medium text-warning text-sm mb-1">来源可信提示</h3>
          <p className="text-xs text-muted leading-relaxed">
            公开节点由第三方维护，其运营者可能查看、记录或篡改你的流量。我们仅做格式转换与聚合，无法验证每个节点的真实运营者。
            使用前请仔细阅读
            <Link href="/disclaimer" className="text-primary hover:text-primary-hover ml-1">
              完整免责声明
            </Link>
            。
          </p>
        </div>
      </div>

      <div className="border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold mb-2">发现数据源失效？</h2>
        <p className="text-xs text-muted leading-relaxed mb-4">
          如果你遇到某个源长期无法访问、返回空内容或节点全部不可用，欢迎在 GitHub 提交 Issue。
          请附上源名称、失效现象和你发现的时间，维护者会尽快核实并处理。
        </p>
        <div className="flex flex-col sm:flex-row items-start gap-2">
          <a
            href="https://github.com/MS33834/freenode/issues/new?template=source_report.md&title=数据源失效报告"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-medium hover:bg-primary-hover transition-colors"
          >
            报告失效源 <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/MS33834/freenode/issues?q=is%3Aissue+label%3Asource%2Fbroken"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium hover:bg-surface-hover transition-colors"
          >
            查看历史 Issue <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
