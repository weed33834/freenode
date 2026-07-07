import type { Metadata } from "next";
import Link from "next/link";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ArrowRight,
  AlertTriangle,
  Wrench,
  BookOpen,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "客户端教程 — FreeNode",
  description:
    "按平台选择合适的代理客户端，查看推荐列表、配置教程与导入常见问题，所有链接指向官方仓库。",
};
import { ClientCard } from "@/components/client-card";
import { FeatureCard } from "@/components/feature-card";
import { StepCard } from "@/components/step-card";

const REPO_DOCS_BASE = "https://github.com/MS33834/freenode/blob/main/docs";

const platforms = [
  {
    icon: Monitor,
    name: "Windows",
    clients: ["v2rayN", "Clash Verge Rev", "FlClash", "Nekoray"],
    guide: `${REPO_DOCS_BASE}/client-setup/v2rayn.md`,
  },
  {
    icon: Monitor,
    name: "macOS",
    clients: ["Clash Verge Rev", "FlClash", "Surge", "Shadowrocket"],
    guide: `${REPO_DOCS_BASE}/client-setup/clash.md`,
  },
  {
    icon: Smartphone,
    name: "Android",
    clients: ["v2rayNG", "NekoBox", "FlClash", "Hiddify"],
    guide: `${REPO_DOCS_BASE}/client-setup/v2rayng.md`,
  },
  {
    icon: Tablet,
    name: "iOS",
    clients: ["Shadowrocket", "Surge", "Stash", "Quantumult X", "Hiddify"],
    guide: `${REPO_DOCS_BASE}/client-setup/shadowrocket.md`,
  },
  {
    icon: Globe,
    name: "Browser",
    clients: ["SwitchyOmega", "FoxyProxy", "SmartProxy"],
    guide: "https://github.com/MS33834/freenode/blob/main/tools/browser-extensions.md",
  },
];

const clients = [
  {
    name: "Clash Verge Rev",
    description: "Clash 内核的跨平台 GUI 客户端，界面现代，支持规则订阅与 TUN 模式。",
    icon: Monitor,
    platforms: ["Windows", "macOS", "Linux"],
    href: "https://github.com/clash-verge-rev/clash-verge-rev",
    tags: ["开源", "免费", "推荐新手"],
    importInstructions: "进入 Profiles / 配置页，粘贴 Clash 订阅链接并下载更新。",
    difficulty: "新手" as const,
    scenario: "日常浏览 / 规则分流",
    rating: 5,
  },
  {
    name: "FlClash",
    description: "基于 Clash Meta 的跨平台客户端，界面简洁，支持 Windows、macOS、Linux 与 Android。",
    icon: Monitor,
    platforms: ["Windows", "macOS", "Linux", "Android"],
    href: "https://github.com/chen08209/FlClash",
    tags: ["开源", "免费", "跨平台"],
    importInstructions: "打开配置页，点击添加订阅，粘贴 Clash 链接后保存并更新。",
    difficulty: "新手" as const,
    scenario: "跨平台 / 全平台",
    rating: 4,
  },
  {
    name: "v2rayN",
    description: "Windows 平台最受欢迎的 V2Ray 客户端，支持 VMess/VLESS/Trojan/SS 等协议。",
    icon: Monitor,
    platforms: ["Windows"],
    href: "https://github.com/2dust/v2rayN",
    tags: ["开源", "免费", "Windows 首选"],
    importInstructions: "订阅分组 → 添加订阅，粘贴 V2Ray 订阅链接，右键分组选择更新订阅。",
    difficulty: "新手" as const,
    scenario: "Windows 日常",
    rating: 5,
  },
  {
    name: "v2rayNG",
    description: "Android 平台经典 V2Ray 客户端，支持多种协议与二维码导入。",
    icon: Smartphone,
    platforms: ["Android"],
    href: "https://github.com/2dust/v2rayNG",
    tags: ["开源", "免费", "Android 首选"],
    importInstructions: "设置 → 订阅设置 → 右上角 +，粘贴 V2Ray 订阅链接，返回首页更新。",
    difficulty: "新手" as const,
    scenario: "Android 日常",
    rating: 5,
  },
  {
    name: "Shadowrocket",
    description: "iOS 平台功能强大的代理客户端，支持多种协议与规则，需付费购买。",
    icon: Tablet,
    platforms: ["iOS"],
    href: "https://apps.apple.com/us/app/shadowrocket/id932747118",
    tags: ["付费", "iOS 首选"],
    importInstructions: "首页右上角 + → 类型选 Subscribe，粘贴 V2Ray 订阅链接后保存并更新。",
    difficulty: "新手" as const,
    scenario: "iOS 日常",
    rating: 5,
  },
  {
    name: "Surge",
    description: "macOS / iOS 平台高级网络工具，支持代理、规则与网络调试，需付费。",
    icon: Tablet,
    platforms: ["macOS", "iOS"],
    href: "https://nssurge.com/",
    tags: ["付费", "高级", "规则强大"],
    importInstructions: "配置 → 新建托管配置或模块，粘贴 Clash / Surge 订阅链接并安装。",
    difficulty: "高阶" as const,
    scenario: "macOS / iOS 高级规则",
    rating: 4,
  },
  {
    name: "Stash",
    description: "iOS / tvOS 平台 Clash 规则客户端，支持 Rule Set 与脚本，需付费。",
    icon: Tablet,
    platforms: ["iOS", "tvOS"],
    href: "https://apps.apple.com/us/app/stash-rule-based-proxy/id1596063349",
    tags: ["付费", "iOS", "Clash 规则"],
    importInstructions: "首页 → 从 URL 下载，粘贴 Clash 订阅链接并设置为活动配置。",
    difficulty: "进阶" as const,
    scenario: "iOS 规则分流",
    rating: 4,
  },
  {
    name: "Quantumult X",
    description: "iOS 平台高度可定制的代理客户端，支持重写、脚本与规则集，需付费。",
    icon: Tablet,
    platforms: ["iOS"],
    href: "https://apps.apple.com/us/app/quantumult-x/id1443988620",
    tags: ["付费", "iOS", "高阶"],
    importInstructions: "风车 → 节点 → 引用（订阅），粘贴 V2Ray 订阅链接后更新。",
    difficulty: "高阶" as const,
    scenario: "iOS 高阶自定义",
    rating: 4,
  },
  {
    name: "Nekoray",
    description: "Windows / Linux 桌面端 sing-box / Xray 客户端，适合进阶用户与 TUN 模式。",
    icon: Wrench,
    platforms: ["Windows", "Linux"],
    href: "https://github.com/MatsuriDayo/nekoray",
    tags: ["开源", "免费", "进阶"],
    importInstructions: "分组 → 新建分组 → 类型选订阅，粘贴 V2Ray 订阅链接并更新。",
    difficulty: "进阶" as const,
    scenario: "Windows / Linux TUN",
    rating: 3,
  },
  {
    name: "NekoBox",
    description: "Android 平台 sing-box 客户端，支持多种出站协议与路由规则。",
    icon: Smartphone,
    platforms: ["Android"],
    href: "https://github.com/MatsuriDayo/NekoBoxForAndroid",
    tags: ["开源", "免费", "进阶"],
    importInstructions: "分组 → 添加分组 → 订阅类型，粘贴 V2Ray 订阅链接后更新。",
    difficulty: "进阶" as const,
    scenario: "Android 进阶",
    rating: 3,
  },
  {
    name: "Hiddify",
    description: "全平台代理客户端，界面友好，支持 Sing-box 与 Xray 核心。",
    icon: Globe,
    platforms: ["Windows", "macOS", "Linux", "Android", "iOS"],
    href: "https://github.com/hiddify/hiddify-next",
    tags: ["开源", "免费", "全平台"],
    importInstructions: "主界面 → 添加配置 → 粘贴订阅链接，应用自动识别并更新。",
    difficulty: "新手" as const,
    scenario: "全平台友好",
    rating: 4,
  },
  {
    name: "Sing-box",
    description: "新一代通用代理平台，提供核心库与官方客户端，支持几乎所有现代协议。",
    icon: Globe,
    platforms: ["Windows", "macOS", "Linux", "Android", "iOS"],
    href: "https://github.com/SagerNet/sing-box",
    tags: ["开源", "免费", "全平台"],
    importInstructions: "配置 → 添加远程配置，粘贴 Clash / V2Ray 订阅链接并更新。",
    difficulty: "进阶" as const,
    scenario: "全平台 / 核心",
    rating: 4,
  },
];

const platformGuides = [
  {
    icon: Monitor,
    platform: "Windows",
    primary: "v2rayN",
    alternatives: "Clash Verge Rev、FlClash、Nekoray",
    format: "V2Ray / Clash",
    difficulty: "新手" as const,
  },
  {
    icon: Monitor,
    platform: "macOS",
    primary: "Clash Verge Rev",
    alternatives: "FlClash、Surge、Sing-box",
    format: "Clash",
    difficulty: "新手" as const,
  },
  {
    icon: Smartphone,
    platform: "Android",
    primary: "v2rayNG",
    alternatives: "NekoBox、FlClash、Hiddify",
    format: "V2Ray / Clash",
    difficulty: "新手" as const,
  },
  {
    icon: Tablet,
    platform: "iOS",
    primary: "Shadowrocket",
    alternatives: "Stash、Quantumult X、Hiddify、Surge",
    format: "V2Ray / Clash",
    difficulty: "新手" as const,
  },
  {
    icon: Globe,
    platform: "Browser",
    primary: "SwitchyOmega",
    alternatives: "FoxyProxy、SmartProxy",
    format: "HTTP(S) / SOCKS4 / SOCKS5",
    difficulty: "新手" as const,
  },
];

const beginnerGuides = [
  {
    title: "新手快速上手",
    desc: "从零开始：选择客户端、复制订阅、导入节点、连接使用。",
    href: `${REPO_DOCS_BASE}/beginner-guide.md`,
  },
  {
    title: "常见问题 FAQ",
    desc: "节点失效、订阅无法更新、客户端报错等问题的排查思路。",
    href: `${REPO_DOCS_BASE}/faq.md`,
  },
  {
    title: "v2rayN 配置教程",
    desc: "Windows 上最受欢迎的 V2Ray 客户端图文配置步骤。",
    href: `${REPO_DOCS_BASE}/client-setup/v2rayn.md`,
  },
  {
    title: "Shadowrocket 配置教程",
    desc: "iOS 平台导入订阅、选择节点、开启连接的完整流程。",
    href: `${REPO_DOCS_BASE}/client-setup/shadowrocket.md`,
  },
];

const faqs = [
  {
    q: "订阅链接无法更新怎么办？",
    a: "检查网络连接与客户端是否被防火墙拦截；尝试切换 GitCode 镜像或手动复制链接到浏览器访问，确认订阅地址可正常返回节点配置。",
  },
  {
    q: "更新后没有节点？",
    a: "确认选择的订阅格式与客户端匹配（Clash 客户端用 Clash 格式，V2Ray 客户端用 V2Ray 格式）；检查订阅链接是否已过期或被重置。",
  },
  {
    q: "Clash 和 V2Ray 格式怎么选？",
    a: "Clash 系列客户端（Clash Verge Rev、FlClash、Stash 等）选 Clash 格式；v2rayN、v2rayNG、Shadowrocket 等通常选 V2Ray 格式。",
  },
  {
    q: "为什么有些节点连不上？",
    a: "节点可能因网络波动、线路拥堵或服务器维护暂时不可用。尝试切换其他节点，或查看节点延迟测试结果选择更稳定的线路。",
  },
  {
    q: "如何切换 GitCode 镜像？",
    a: "在 /subscribe 页面复制订阅时，留意是否提供 GitCode / GitHub 两种镜像地址；将客户端中的订阅链接替换为镜像地址后重新更新即可。",
  },
  {
    q: "iOS 没有 Shadowrocket 怎么办？",
    a: "可使用 Stash、Quantumult X、Hiddify 等替代客户端；若无法购买美区账号，也可尝试支持 TestFlight 或国区上架的代理工具。",
  },
];

const difficultyBadgeClass = (level: string) => {
  switch (level) {
    case "新手":
      return "text-success border-success/30 bg-success/10";
    case "进阶":
      return "text-warning border-warning/30 bg-warning/10";
    case "高阶":
      return "text-danger border-danger/30 bg-danger/10";
    default:
      return "text-muted border-border bg-surface";
  }
};

export default function ClientsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">客户端教程</h1>
        <p className="text-sm text-muted max-w-2xl">
          根据你的设备和需求选择合适的客户端，并查看对应配置教程。所有链接均指向官方或开源仓库。
        </p>
      </div>

      <div className="border border-warning/20 bg-warning/10 p-3 mb-8 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="text-warning">安全提示：</strong>
          客户端本身不会保护你的隐私，免费节点的运营者仍可能查看你的流量。请仅从官方渠道下载客户端，避免使用来路不明的破解版或修改版。
        </div>
      </div>

      <div className="border border-border bg-surface p-5 mb-10">
        <h2 className="text-lg font-semibold mb-4">3 步快速上手</h2>
        <div className="max-w-2xl">
          <StepCard
            step={1}
            title="选择下方推荐客户端并下载"
            description={
              <>
                根据设备与使用场景，从下方推荐区选择客户端；不确定时可参考{" "}
                <a href="#platform-guide" className="text-primary hover:underline">
                  按平台选择指南
                </a>
                。
              </>
            }
          />
          <StepCard
            step={2}
            title="到 /subscribe 复制对应格式的订阅链接"
            description={
              <>
                前往{" "}
                <Link href="/subscribe" className="text-primary hover:underline">
                  /subscribe
                </Link>{" "}
                页面，选择客户端支持的格式（Clash / V2Ray）并复制订阅链接。
              </>
            }
          />
          <StepCard
            step={3}
            title="在客户端粘贴订阅并更新"
            description="打开客户端的订阅或配置页面，粘贴复制的链接，点击更新即可获取最新节点。"
            last
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="border border-border bg-surface p-4 text-center"
          >
            <div className="p-1.5 border border-border text-primary inline-flex mb-3">
              <p.icon className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm mb-2">{p.name}</h3>
            <ul className="text-xs text-muted space-y-1 mb-3">
              {p.clients.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <a
              href={p.guide}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
            >
              查看教程 <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>

      <div id="platform-guide" className="mb-12">
        <h2 className="text-lg font-semibold mb-4">按平台选择指南</h2>
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-border">平台</th>
                <th className="px-4 py-3 font-medium border-b border-border">首推客户端</th>
                <th className="px-4 py-3 font-medium border-b border-border">备选客户端</th>
                <th className="px-4 py-3 font-medium border-b border-border">推荐格式</th>
                <th className="px-4 py-3 font-medium border-b border-border">难度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {platformGuides.map((pg) => (
                <tr
                  key={pg.platform}
                  className="bg-background hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <pg.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{pg.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{pg.primary}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{pg.alternatives}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pg.format}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border ${difficultyBadgeClass(
                        pg.difficulty
                      )}`}
                    >
                      {pg.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">推荐客户端</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
        {clients.map((c) => (
          <ClientCard key={c.name} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            图文教程
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {beginnerGuides.map((g) => (
              <a
                key={g.title}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
              >
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-1">
                  {g.title}
                </h3>
                <p className="text-xs text-muted">{g.desc}</p>
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">如何选择客户端？</h2>
          <div className="space-y-3">
            <FeatureCard
              icon={Monitor}
              title="新手用户"
              description="推荐 Clash Verge Rev（Windows/macOS/Linux）、v2rayN（Windows）、v2rayNG（Android）、Shadowrocket（iOS）。界面直观，支持一键订阅。"
            />
            <FeatureCard
              icon={Wrench}
              title="进阶用户"
              description="可尝试 NekoBox、Sing-box、Stash、Quantumult X 等，支持更灵活的规则、TUN 模式与协议组合。"
            />
            <FeatureCard
              icon={Globe}
              title="临时/轻量"
              description="浏览器扩展 + HTTP(S)/SOCKS4/SOCKS5 代理列表，适合临时访问或爬虫场景，不建议长期使用。"
            />
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          导入常见问题
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {faqs.map((f, idx) => (
            <div
              key={f.q}
              className="border border-border bg-surface p-4"
            >
              <h3 className="font-medium text-sm mb-1.5 flex items-start gap-2">
                <span className="text-primary text-xs mt-0.5">Q{idx + 1}.</span>
                {f.q}
              </h3>
              <p className="text-xs text-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-2">还没决定用哪个？</h2>
        <p className="text-sm text-muted mb-4 max-w-lg">
          先阅读新手快速上手指南，了解代理的基本概念和使用流程，再根据自己的设备选择客户端。
        </p>
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <a
            href={`${REPO_DOCS_BASE}/beginner-guide.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            阅读新手指南 <ArrowRight className="w-4 h-4" />
          </a>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            去复制订阅链接
          </Link>
        </div>
      </div>
    </div>
  );
}
