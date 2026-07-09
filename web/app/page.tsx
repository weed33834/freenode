import Link from "next/link";
import {
  ArrowRight,
  Shield,
  RefreshCw,
  Layers,
  Globe,
  Server,
  Database,
  Clock,
  FileText,
  Cpu,
  Newspaper,
  Users,
  Star,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { getLatestVersion } from "@/lib/data";
import { fetchStats, fetchProtocols, getSubscriptionUrl } from "@/lib/api";
import { platforms } from "@/lib/platforms";
import { StatsSection } from "@/components/stats-section";
import { ProtocolChart } from "@/components/protocol-chart";
import { SubscribeCard } from "@/components/subscribe-card";
import { FeatureCard } from "@/components/feature-card";
import { StepCard } from "@/components/step-card";
import { FaqSection } from "@/components/faq-section";
import { ProtocolSection } from "@/components/protocol-section";

const features = [
  {
    icon: RefreshCw,
    title: "每日自动更新",
    description:
      "GitHub Actions 每天 UTC 02:00 自动抓取、解析、校验并发布最新节点，无需手动维护。",
  },
  {
    icon: Layers,
    title: "多格式输出",
    description:
      "同时提供 Clash、V2Ray 与 HTTP(S)/SOCKS4/SOCKS5 三种订阅格式，覆盖主流客户端与使用场景。",
  },
  {
    icon: Shield,
    title: "数据源透明",
    description:
      "所有数据源、脚本与配置完全公开。社区可以直接查看、替换或新增 config/sources.json 中的公开源。",
  },
];

const steps = [
  {
    title: "选择客户端",
    description: "根据设备选择合适的代理客户端。",
  },
  {
    title: "复制订阅链接",
    description: "选择 Clash 或 V2Ray 格式，复制 GitHub 或 GitCode 镜像链接。",
  },
  {
    title: "导入并更新",
    description: "在客户端中粘贴订阅链接并更新，即可拉取当日最新节点列表。",
  },
  {
    title: "连接使用",
    description: "选择延迟较低的节点连接。免费节点稳定性有限，可次日等待自动更新。",
  },
];

const faqs = [
  {
    question: "FreeNode 的节点从哪里来？",
    answer:
      "所有节点均来自互联网公开渠道（GitHub、公开订阅等）。本项目仅做聚合、解析与格式转换，不生产也不运营节点。",
  },
  {
    question: "订阅链接多久更新一次？",
    answer:
      "自动化流程每天 UTC 02:00（北京时间 10:00）运行一次，抓取最新数据源并更新产物文件。",
  },
  {
    question: "为什么有些节点无法连接？",
    answer:
      "免费公开节点时效性强，可能随时失效。流水线会做基础 TCP 连通性校验，但无法保证每个节点在每位用户网络下都可用。",
  },
  {
    question: "使用免费节点是否安全？",
    answer:
      "公开节点存在流量被查看、记录或篡改的风险。请仅用于学习研究，不要登录银行、支付、社交等敏感账户。",
  },
  {
    question: "如何贡献新的数据源？",
    answer:
      "编辑 config/sources.json 添加公开数据源，并提交 Pull Request。新源需为公开可访问、持续更新的链接。",
  },
];

export default async function HomePage() {
  // 运行期从后端拉数据，失败兜底为空值
  const statsData = await fetchStats();
  const protocols = await fetchProtocols();

  const protocolCounts: Record<string, number> = {};
  for (const p of protocols) protocolCounts[p.protocol] = p.total;

  const generatedAt = statsData?.last_updated
    ? new Date(statsData.last_updated).toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "未知";

  const stats = {
    generatedAt,
    totalNodes: statsData?.total_nodes ?? 0,
    enabledSources: statsData?.enabled_sources ?? 0,
    totalSources: statsData?.total_sources ?? 0,
    protocolCounts,
  };

  const clashUrl = getSubscriptionUrl("clash");
  const v2rayUrl = getSubscriptionUrl("v2ray");
  const proxiesUrl = getSubscriptionUrl("plain");
  const latestVersion = getLatestVersion();

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <p className="text-xs text-muted font-mono mb-3">开源 · 每日更新 · 公开节点聚合</p>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
              免费公开代理 / VPN
              <br />
              <span className="text-primary">节点聚合站</span>
            </h1>
            <p className="text-sm md:text-base text-muted mb-8 leading-relaxed max-w-xl">
              FreeNode 自动抓取、解析、校验互联网公开节点，输出 Clash、V2Ray、HTTP(S)/SOCKS4/SOCKS5
              三种订阅格式。仅供学习网络协议、安全测试和隐私技术研究使用。
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                获取订阅链接 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sources"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-surface text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                <Shield className="w-4 h-4" /> 查看数据源
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection
        generatedAt={stats.generatedAt}
        totalNodes={stats.totalNodes}
        enabledSources={stats.enabledSources}
        totalSources={stats.totalSources}
        protocolCount={Object.keys(stats.protocolCounts).length || 0}
      />

      {/* Latest Updates */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">最新动态</h2>
              <p className="text-sm text-muted">项目数据与版本更新的快速入口</p>
            </div>
            <Link
              href="/changelog"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
            >
              查看更新日志 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/status"
              className="group border border-border bg-surface p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                  最近更新
                </h3>
              </div>
              <div className="text-2xl font-semibold font-mono mb-1">
                {stats.totalNodes}
              </div>
              <p className="text-xs text-muted">
                节点已生成于 {stats.generatedAt}
              </p>
            </Link>

            <Link
              href="/status"
              className="group border border-border bg-surface p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                  数据源状态
                </h3>
              </div>
              <div className="text-2xl font-semibold font-mono mb-1">
                {stats.enabledSources}/{stats.totalSources}
              </div>
              <p className="text-xs text-muted">当前启用的数据源数量</p>
            </Link>

            <Link
              href="/changelog"
              className="group border border-border bg-surface p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                  版本动态
                </h3>
              </div>
              <div className="text-2xl font-semibold font-mono mb-1">{latestVersion}</div>
              <p className="text-xs text-muted">新增路线图、状态页与架构说明</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Index Preview */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">平台索引</h2>
              <p className="text-sm text-muted">
                精选 GitHub 上知名的代理节点分享仓库，按需选择订阅源
              </p>
            </div>
            <Link
              href="/platforms"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms
              .filter((p) => p.featured)
              .slice(0, 3)
              .map((platform) => (
                <a
                  key={`${platform.owner}/${platform.name}`}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col border border-border bg-surface p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="inline-flex items-center gap-1.5 text-base font-semibold group-hover:text-primary transition-colors">
                        <span className="truncate">{platform.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-primary" />
                      </h3>
                      <p className="text-xs text-muted font-mono mt-0.5 truncate">
                        {platform.owner}/{platform.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 border border-border text-muted shrink-0">
                      <Star className="w-3 h-3 text-primary" />
                      {platform.stars}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed mb-4 flex-1 line-clamp-3">
                    {platform.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {platform.protocols.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted uppercase"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted pt-2 border-t border-border">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-primary font-medium">推荐</span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />
                    <span>{platform.updateFrequency}</span>
                  </div>
                </a>
              ))}
          </div>

          <div className="mt-6 sm:hidden">
            <Link
              href="/platforms"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Teaser */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
                <Cpu className="w-3.5 h-3.5" />
                ARCHITECTURE
              </div>
              <h2 className="text-xl font-semibold mb-3">从数据源到你的客户端</h2>
              <p className="text-sm text-muted leading-relaxed mb-5">
                FreeNode 通过一条全自动化流水线完成抓取、解析、校验与发布。你可以在架构说明页面查看每个步骤的详细文件路径与设计原则。
              </p>
              <Link
                href="/architecture"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                查看完整架构 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="border border-border bg-surface p-5">
              <div className="space-y-3">
                {[
                  { step: "1", title: "配置", desc: "config/sources.json" },
                  { step: "2", title: "抓取", desc: "scripts/crawler.py" },
                  { step: "3", title: "解析", desc: "scripts/parser.py" },
                  { step: "4", title: "校验", desc: "scripts/verifier.py" },
                  { step: "5", title: "输出", desc: "scripts/formatter.py" },
                  { step: "6", title: "部署", desc: "GitHub Actions" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="w-5 h-5 border border-primary text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="text-sm font-medium w-12">{item.title}</div>
                    <code className="flex-1 px-2 py-1 bg-background border border-border text-[10px] font-mono text-muted truncate">
                      {item.desc}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe Preview */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">三种订阅格式</h2>
              <p className="text-sm text-muted">根据你使用的客户端选择合适的订阅链接</p>
            </div>
            <Link
              href="/subscribe"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SubscribeCard
              title="Clash"
              description="Clash Verge / Clash Meta / Clash for Windows / Stash / Surge"
              url={clashUrl}
              icon={<Server className="w-5 h-5" />}
            />
            <SubscribeCard
              title="V2Ray"
              description="v2rayN / v2rayNG / Shadowrocket / NekoBox / 其他 V2Ray 内核客户端"
              url={v2rayUrl}
              icon={<Globe className="w-5 h-5" />}
            />
            <SubscribeCard
              title="HTTP(S) / SOCKS4 / SOCKS5"
              description="浏览器扩展、爬虫、命令行工具使用的公开代理列表"
              url={proxiesUrl}
              icon={<Layers className="w-5 h-5" />}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-1">核心特性</h2>
            <p className="text-sm text-muted">围绕自动化、透明度与可扩展性设计</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works + Chart */}
      <section className="py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-6">四步开始使用</h2>
              <div>
                {steps.map((s, index) => (
                  <StepCard key={s.title} step={index + 1} {...s} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-1">当前节点概览</h2>
                <p className="text-sm text-muted">数据每日自动刷新，可用性受网络环境影响</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border border-border bg-surface p-3">
                  <div className="text-xl font-semibold font-mono">{stats.totalNodes}</div>
                  <div className="text-[10px] text-muted">可用节点</div>
                </div>
                <div className="border border-border bg-surface p-3">
                  <div className="text-xl font-semibold font-mono">{stats.enabledSources}</div>
                  <div className="text-[10px] text-muted">启用数据源</div>
                </div>
                <div className="border border-border bg-surface p-3">
                  <div className="text-xl font-semibold font-mono">
                    {Object.keys(stats.protocolCounts).length || 0}
                  </div>
                  <div className="text-[10px] text-muted">识别协议</div>
                </div>
                <div className="border border-border bg-surface p-3">
                  <div className="text-sm font-semibold font-mono">{stats.generatedAt}</div>
                  <div className="text-[10px] text-muted">最近更新</div>
                </div>
              </div>
              <ProtocolChart counts={stats.protocolCounts} />
              <div className="mt-4 border border-primary/20 bg-primary/5 p-3 text-xs text-muted">
                <strong className="text-foreground">提示：</strong>
                每日 CI 默认启用 TCP 连通性校验；本地可通过{" "}
                <code className="px-1 py-0.5 bg-background text-primary font-mono text-[10px]">
                  python3 scripts/update.py --no-verify
                </code>{" "}
                关闭验证以加速测试。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocols */}
      <ProtocolSection />

      {/* Data Transparency */}
      <section className="py-14 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-3">每个节点都来自公开渠道</h2>
              <p className="text-sm text-muted leading-relaxed mb-4">
                FreeNode 不生产、不运营任何节点。所有数据源均列在{" "}
                <Link href="/sources" className="text-primary hover:text-primary-hover">
                  数据源页面
                </Link>
                ，包含更新频率、协议类型与来源说明。你可以随时审计、替换或贡献新的公开源。
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">·</span>
                  数据源配置完全公开（config/sources.json）
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">·</span>
                  每日自动抓取并记录抓取结果
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">·</span>
                  输出文件附带免责声明与生成时间
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">·</span>
                  私有 IP 与本地地址默认被过滤
                </li>
              </ul>
            </div>
            <div className="border border-border bg-surface p-5">
              <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                自动化流水线
              </h3>
              <div className="space-y-3">
                {[
                  { step: "1", title: "抓取", desc: "并发拉取所有启用数据源" },
                  { step: "2", title: "解析", desc: "提取并去重 VLESS/VMess/SS/Trojan 链接" },
                  { step: "3", title: "校验", desc: "可选 TCP 连通性与延迟检测" },
                  { step: "4", title: "生成", desc: "输出 Clash / V2Ray / 代理列表" },
                  { step: "5", title: "同步", desc: "自动推送 GitHub 与 GitCode 双端" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-5 h-5 border border-primary text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-1">常见问题</h2>
            <p className="text-sm text-muted">关于数据源、更新频率、安全与贡献的常见问题解答</p>
          </div>
          <FaqSection items={faqs} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="border border-border bg-surface p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-2">准备好开始了吗？</h2>
            <p className="text-sm text-muted mb-6 max-w-lg">
              选择适合你的客户端，复制订阅链接，即可导入每日更新的免费节点。发现数据源失效或有改进建议，欢迎提交 Issue 或 PR。
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Link
                href="/clients"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                查看客户端教程 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                <FileText className="w-4 h-4" /> 获取订阅链接
              </Link>
              <Link
                href="/contribute"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                <Users className="w-4 h-4" /> 参与贡献
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
