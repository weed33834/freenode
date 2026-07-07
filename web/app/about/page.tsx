import type { Metadata } from "next";
import Link from "next/link";
import { parseChangelog } from "@/lib/data";
import {
  Globe,
  Shield,
  RefreshCw,
  Users,
  Scale,
  Eye,
  BookOpen,
  Heart,
  ArrowRight,
  Cpu,
  Layers,
  Server,
  FileText,
  History,
  Rocket,
  Radio,
  Code2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "关于 — FreeNode",
  description:
    "了解 FreeNode 的项目定位、核心原则、技术架构与版本历程，一个社区维护的免费公开代理与节点聚合项目。",
};

const principles = [
  {
    icon: Eye,
    title: "完全透明",
    description:
      "所有数据源、脚本、配置和输出文件均公开可查。你可以直接查看 config/sources.json 和 scripts/，确认没有隐藏节点或私有服务器。",
  },
  {
    icon: RefreshCw,
    title: "自动化优先",
    description:
      "节点每天自动抓取、解析、格式化并发布。维护者只需管理 config/sources.json 和脚本，减少手动操作带来的延迟和错误。",
  },
  {
    icon: Shield,
    title: "安全边界",
    description:
      "默认过滤私有 IP 与本地地址，所有产物附带免责声明。我们明确告知风险，不提供任何安全承诺。",
  },
  {
    icon: Users,
    title: "社区驱动",
    description:
      "数据源由社区推荐，代码由社区审阅。项目方向通过 GitHub Issues、Pull Request 和未来方向页公开讨论，决策过程透明。",
  },
  {
    icon: Scale,
    title: "合规使用",
    description:
      "项目定位为网络协议学习、安全测试与隐私技术研究的公共资源索引，不鼓励也不协助任何违法行为。",
  },
  {
    icon: BookOpen,
    title: "文档完整",
    description:
      "从新手快速上手到架构说明、开发部署、维护排错，文档覆盖多个层次，帮助使用者与贡献者更快入门。",
  },
];

const milestones = [
  { date: "2026-06-01", title: "项目启动", desc: "确定 FreeNode 定位，初始化仓库与数据源配置。" },
  { date: "2026-06-03", title: "自动化流水线搭建", desc: "完成爬虫、解析器、校验器与格式化器，打通端到端自动更新。" },
  { date: "2026-06-08", title: "多格式输出支持", desc: "支持 Clash YAML、V2Ray 订阅、HTTP(S)/SOCKS4/SOCKS5 代理列表。" },
  { date: "2026-06-10", title: "双仓库同步", desc: "GitHub 主仓库与 GitCode 镜像同步，提升国内外访问稳定性。" },
  { date: "2026-06-12", title: "前端 Next.js 站点上线", desc: "静态展示站点发布，包含订阅、数据源、客户端与社区页面。" },
  { date: "2026-06-14", title: "文档站 VitePress 上线", desc: "完整文档体系上线，覆盖新手指南、部署运维与客户端教程。" },
  { date: "2026-06-18", title: "平台索引上线", desc: "新增 platforms 页面，支持按协议、地区与可用性筛选节点源。" },
  { date: "2026-06-20", title: "验证流程优化", desc: "默认启用节点连通性测试，每日构建自动剔除不可达节点。" },
  { date: "2026-06-22", title: "社区贡献体系建立", desc: "完善 Issue 模板、贡献指南、行为准则与核心贡献者名单。" },
  { date: "未来", title: "节点质量仪表板", desc: "计划上线历史可用率、延迟趋势与地区分布的可视化面板。" },
];

const team = [
  {
    name: "MS33834",
    role: "项目发起人",
    duties: "项目方向、架构设计、核心代码与发布管理",
    areas: ["自动化流水线", "架构设计", "版本发布"],
    icon: Rocket,
  },
  {
    name: "社区贡献者",
    role: "数据源维护",
    duties: "发现、验证与维护公开数据源，保持 sources.json 最新",
    areas: ["数据源挖掘", "节点验证", "配置更新"],
    icon: Radio,
  },
  {
    name: "代码审阅者",
    role: "质量把控",
    duties: "Review Pull Request，确保代码风格、测试与安全性",
    areas: ["代码审阅", "测试覆盖", "安全审计"],
    icon: Code2,
  },
  {
    name: "文档维护者",
    role: "教程编写",
    duties: "维护 VitePress 文档站、FAQ 与客户端图文教程",
    areas: ["文档编写", "教程翻译", "用户支持"],
    icon: FileText,
  },
];

const architectureLayers = [
  {
    title: "数据采集层",
    subtitle: "Data Collection",
    desc: "由 config/sources.json 定义数据源，crawler.py 批量抓取，parser.py 解析 SSR/vmess/VLESS/Trojan 等多种协议。",
    icon: Layers,
  },
  {
    title: "验证转换层",
    subtitle: "Verification & Format",
    desc: "verifier.py 执行 TCP 连通性、IP 黑名单与重复节点检查；formatter.py 输出 Clash、V2Ray 与代理列表。",
    icon: Cpu,
  },
  {
    title: "发布展示层",
    subtitle: "Publication",
    desc: "GitHub Actions 每日定时调度，自动部署 Next.js 站点、VitePress 文档并向仓库写入最新节点产物。",
    icon: Server,
  },
];

const asciiArchitecture = `
┌──────────────────────────────────────────────────────────────────────┐
│                      数据采集层  (Data Collection)                    │
│   config/sources.json  ──▶  crawler.py  ──▶  parser.py               │
│      数据源配置                批量抓取           多协议解析           │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  验证转换层  (Verification & Format)                  │
│   verifier.py  ──▶  formatter.py                                     │
│    连通性/去重/黑名单        输出 Clash / V2Ray / 代理列表             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       发布展示层  (Publication)                       │
│   GitHub Actions  ──▶  Next.js 站点  +  VitePress 文档  +  nodes/    │
│      每日自动调度            订阅页面        教程文档      节点产物     │
└──────────────────────────────────────────────────────────────────────┘
`;

export default function AboutPage() {
  const versions = parseChangelog()
    .slice(0, 3)
    .map((entry) => ({
      version: entry.version,
      date: entry.date,
      summary: Object.values(entry.categories).flat().slice(0, 3),
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Globe className="w-3.5 h-3.5" />
          ABOUT
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">关于 FreeNode</h1>
        <p className="text-sm text-muted max-w-2xl">
          一个社区维护的免费代理与公开节点聚合项目，让网络协议学习、安全测试与隐私技术研究更透明、更高效。
        </p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14">
        <div>
          <h2 className="text-xl font-semibold mb-3">我们做什么</h2>
          <p className="text-sm text-muted leading-relaxed mb-4">
            FreeNode 不运营任何代理或 VPN 节点。我们只做三件事：发现互联网上公开分享的节点与代理源，将其解析为标准化格式，再通过自动化流水线每日发布到仓库与站点。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-4">
            通过统一的配置、可复用的脚本和透明的数据源列表，用户可以快速找到适合自己的客户端订阅，开发者也可以基于此构建自己的工具链。
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link
              href="/subscribe"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              获取订阅 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-surface text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              <Heart className="w-4 h-4" /> 参与贡献
            </Link>
          </div>
        </div>
        <div className="border border-border bg-surface p-5">
          <h3 className="font-medium text-sm mb-4">项目速览</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">项目名称</dt>
              <dd className="font-mono">FreeNode</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">许可证</dt>
              <dd>MIT</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">主仓库</dt>
              <dd className="font-mono text-primary">github.com/MS33834/freenode</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">镜像仓库</dt>
              <dd className="font-mono text-primary">gitcode.com/badhope/freenode</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">更新频率</dt>
              <dd>每日 UTC 02:00</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">主要技术栈</dt>
              <dd>Python / Next.js / Tailwind CSS / VitePress</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-6">核心原则</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="border border-border bg-surface p-5">
                <div className="p-1.5 border border-border text-primary inline-flex mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-sm mb-2">{p.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-6">项目里程碑</h2>
        <div className="border border-border bg-surface p-5">
          <div className="space-y-4">
            {milestones.map((m) => (
              <div key={`${m.date}-${m.title}`} className="flex items-start gap-4">
                <div className="w-20 shrink-0 text-xs font-mono text-primary pt-1">{m.date}</div>
                <div>
                  <h3 className="text-sm font-medium mb-1">{m.title}</h3>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">核心团队</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((member) => {
            const Icon = member.icon;
            return (
              <div
                key={member.name}
                className="border border-border bg-surface p-5 hover:border-primary transition-colors"
              >
                <div className="p-1.5 border border-border text-primary inline-flex mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-sm mb-1">{member.name}</h3>
                <p className="text-xs text-primary mb-3">{member.role}</p>
                <p className="text-xs text-muted leading-relaxed mb-4">{member.duties}</p>
                <div className="flex flex-wrap gap-2">
                  {member.areas.map((area) => (
                    <span
                      key={area}
                      className="px-1.5 py-0.5 border border-border text-[10px] text-muted"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">技术架构</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {architectureLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.title} className="border border-border bg-surface p-5">
                <div className="p-1.5 border border-border text-primary inline-flex mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-sm mb-1">{layer.title}</h3>
                <p className="text-[10px] text-muted font-mono mb-3">{layer.subtitle}</p>
                <p className="text-xs text-muted leading-relaxed">{layer.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="border border-border bg-surface p-5 overflow-x-auto">
          <pre className="text-xs text-muted font-mono leading-relaxed whitespace-pre">
            {asciiArchitecture}
          </pre>
        </div>
      </section>

      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">版本历程</h2>
        </div>
        <div className="border border-border bg-surface p-5">
          {versions.length === 0 ? (
            <p className="text-sm text-muted">暂时无法读取 CHANGELOG，请稍后查看。</p>
          ) : (
            <div className="space-y-5">
              {versions.map((v) => (
                <div
                  key={v.version}
                  className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-border last:border-0 pb-5 last:pb-0"
                >
                  <div className="sm:w-36 shrink-0">
                    <div className="text-sm font-mono font-medium text-primary">v{v.version}</div>
                    <div className="text-xs text-muted">{v.date}</div>
                  </div>
                  <ul className="space-y-1.5 flex-1">
                    {v.summary.map((item) => (
                      <li key={`${v.version}-${item}`} className="flex items-start gap-2 text-sm text-muted">
                        <span className="text-primary mt-1.5">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-border">
            <a
              href="https://github.com/MS33834/freenode/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover"
            >
              查看完整 CHANGELOG <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-3">重要声明</h2>
        <p className="text-sm text-muted leading-relaxed mb-4">
          FreeNode 仅作为公开资源的聚合与格式化工具，所有节点与代理均来自第三方公开渠道。我们不保证其可用性、安全性或隐私性，也不对因使用本项目而产生的任何直接或间接损失负责。
        </p>
        <Link
          href="/disclaimer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover"
        >
          阅读完整免责声明 <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
