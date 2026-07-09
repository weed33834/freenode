import type { Metadata } from "next";
import Link from "next/link";
import { getSubscriptionUrl } from "@/lib/api";

export const metadata: Metadata = {
  title: "工具与生态 — FreeNode",
  description:
    "整理各平台常用代理客户端、浏览器扩展、命令行工具与路由器方案，配合命令行示例与工具选择决策树。",
};
import { CopyButton } from "@/components/copy-button";
import {
  Wrench,
  Monitor,
  Smartphone,
  Router,
  Terminal,
  Globe,
  ExternalLink,
  ArrowRight,
  User,
  Apple,
  Code,
} from "lucide-react";

const categories = [
  {
    icon: Monitor,
    title: "桌面客户端",
    description: "Windows、macOS、Linux 上的图形化代理客户端，适合日常浏览与规则分流。",
    items: [
      {
        name: "Clash Verge Rev",
        href: "https://github.com/clash-verge-rev/clash-verge-rev",
        note: "跨平台 Clash GUI",
        scenario: "日常上网、规则分流与订阅管理的一站式入门选择。",
        tags: ["跨平台", "Clash", "图形界面"],
        difficulty: "beginner" as const,
      },
      {
        name: "FlClash",
        href: "https://github.com/chen08209/FlClash",
        note: "Clash Meta 跨平台客户端",
        scenario: "需要同时覆盖桌面与移动设备的 Clash Meta 用户。",
        tags: ["跨平台", "Clash Meta", "Flutter"],
        difficulty: "beginner" as const,
      },
      {
        name: "v2rayN",
        href: "https://github.com/2dust/v2rayN",
        note: "Windows 首选",
        scenario: "Windows 用户导入 V2Ray/VMess/VLESS 订阅的主流方案。",
        tags: ["Windows", "V2Ray"],
        difficulty: "beginner" as const,
      },
      {
        name: "Nekoray",
        href: "https://github.com/MatsuriDayo/nekoray",
        note: "sing-box / Xray 桌面端",
        scenario: "需要 TUN 模式、代理链或 sing-box 内核的进阶桌面用户。",
        tags: ["sing-box", "Xray", "TUN"],
        difficulty: "intermediate" as const,
      },
      {
        name: "Hiddify",
        href: "https://github.com/hiddify/hiddify-next",
        note: "全平台友好",
        scenario: "追求开箱即用、界面现代的全平台用户。",
        tags: ["全平台", "易用", "sing-box"],
        difficulty: "beginner" as const,
      },
      {
        name: "Sing-box",
        href: "https://github.com/SagerNet/sing-box",
        note: "通用代理平台",
        scenario: "需要跨平台统一内核、命令行与图形界面兼顾的用户。",
        tags: ["全平台", "核心库", "路由"],
        difficulty: "intermediate" as const,
      },
    ],
  },
  {
    icon: Smartphone,
    title: "移动客户端",
    description: "Android 与 iOS 上的代理应用，支持二维码、订阅链接导入。",
    items: [
      {
        name: "v2rayNG",
        href: "https://github.com/2dust/v2rayNG",
        note: "Android 首选",
        scenario: "Android 用户通过订阅或二维码快速导入节点。",
        tags: ["Android", "V2Ray"],
        difficulty: "beginner" as const,
      },
      {
        name: "NekoBox",
        href: "https://github.com/MatsuriDayo/NekoBoxForAndroid",
        note: "Android sing-box",
        scenario: "Android 进阶用户需要 sing-box 特性与分流规则。",
        tags: ["Android", "sing-box"],
        difficulty: "intermediate" as const,
      },
      {
        name: "Shadowrocket",
        href: "https://apps.apple.com/us/app/shadowrocket/id932747118",
        note: "iOS 付费",
        scenario: "iOS 用户日常稳定使用，导入订阅即可上网。",
        tags: ["iOS", "付费"],
        difficulty: "beginner" as const,
      },
      {
        name: "Stash",
        href: "https://apps.apple.com/us/app/stash-rule-based-proxy/id1596063349",
        note: "iOS/tvOS 付费",
        scenario: "iOS 高阶用户需要规则集、脚本与 tvOS 支持。",
        tags: ["iOS", "tvOS", "规则"],
        difficulty: "intermediate" as const,
      },
      {
        name: "Quantumult X",
        href: "https://apps.apple.com/us/app/quantumult-x/id1443988620",
        note: "iOS 高阶",
        scenario: "iOS 极客用户需要重写、脚本与精细化流量控制。",
        tags: ["iOS", "脚本", "重写"],
        difficulty: "advanced" as const,
      },
      {
        name: "Surge",
        href: "https://nssurge.com/",
        note: "iOS/macOS 高级",
        scenario: "需要在 iOS/macOS 上进行专业网络调试与规则管理。",
        tags: ["iOS", "macOS", "专业"],
        difficulty: "advanced" as const,
      },
    ],
  },
  {
    icon: Globe,
    title: "浏览器扩展",
    description: "配合 HTTP(S)/SOCKS4/SOCKS5 代理列表使用，适合临时访问、爬虫或分场景代理。",
    items: [
      {
        name: "SwitchyOmega",
        href: "https://github.com/FelisCatus/SwitchyOmega",
        note: "Chrome/Firefox 经典",
        scenario: "需要在 Chrome/Firefox 中快速切换多个代理配置。",
        tags: ["Chrome", "Firefox", "切换"],
        difficulty: "beginner" as const,
      },
      {
        name: "FoxyProxy",
        href: "https://github.com/foxyproxy/browser-extension",
        note: "多浏览器支持",
        scenario: "为不同网站指定不同代理规则，兼容多款浏览器。",
        tags: ["多浏览器", "规则"],
        difficulty: "beginner" as const,
      },
      {
        name: "SmartProxy",
        href: "https://github.com/salarcode/SmartProxy",
        note: "规则自动切换",
        scenario: "根据访问域名自动在直连与代理之间切换。",
        tags: ["自动切换", "规则"],
        difficulty: "intermediate" as const,
      },
    ],
  },
  {
    icon: Terminal,
    title: "命令行工具",
    description: "适合开发者、运维人员在服务器或本地脚本中快速验证代理可用性。",
    items: [
      {
        name: "curl",
        href: "https://curl.se/",
        note: "配合 --proxy 测试",
        scenario: "快速测试代理连通性与出口 IP。",
        tags: ["测试", "命令行"],
        difficulty: "beginner" as const,
      },
      {
        name: "proxychains-ng",
        href: "https://github.com/rofl0r/proxychains-ng",
        note: "Linux 透明代理",
        scenario: "为不原生支持代理的 Linux 程序强制走代理。",
        tags: ["Linux", "透明代理"],
        difficulty: "intermediate" as const,
      },
      {
        name: "sing-box CLI",
        href: "https://sing-box.sagernet.org/",
        note: "核心库命令行",
        scenario: "在服务器或本地编写路由规则、运行代理核心。",
        tags: ["核心", "路由", "服务器"],
        difficulty: "advanced" as const,
      },
      {
        name: "mitmproxy",
        href: "https://mitmproxy.org/",
        note: "HTTPS 抓包与代理",
        scenario: "调试 HTTPS 流量、拦截与修改请求。",
        tags: ["抓包", "HTTPS", "调试"],
        difficulty: "advanced" as const,
      },
    ],
  },
  {
    icon: Router,
    title: "路由器 / 软路由",
    description: "将代理部署在网关层，实现局域网内全设备透明代理。",
    items: [
      {
        name: "OpenClash",
        href: "https://github.com/vernesong/OpenClash",
        note: "OpenWrt Clash 插件",
        scenario: "OpenWrt 路由器上运行 Clash 实现全家透明代理。",
        tags: ["OpenWrt", "Clash", "透明代理"],
        difficulty: "advanced" as const,
      },
      {
        name: "PassWall",
        href: "https://github.com/xiaorouji/openwrt-passwall",
        note: "OpenWrt 代理集合",
        scenario: "OpenWrt 路由器上集中管理多种代理协议。",
        tags: ["OpenWrt", "多协议"],
        difficulty: "advanced" as const,
      },
      {
        name: "ImmortalWrt",
        href: "https://github.com/immortalwrt/immortalwrt",
        note: "OpenWrt 衍生固件，可安装代理插件",
        scenario: "刷机后获得更友好的软件源与代理插件支持。",
        tags: ["固件", "OpenWrt"],
        difficulty: "intermediate" as const,
      },
    ],
  },
  {
    icon: Wrench,
    title: "辅助工具",
    description: "节点解析、格式转换、延迟测试等小工具，可与 FreeNode 配合使用。",
    items: [
      {
        name: "subconverter",
        href: "https://github.com/tindy2013/subconverter",
        note: "订阅格式转换",
        scenario: "将 V2Ray/Clash 订阅互相转换或添加自定义规则。",
        tags: ["格式转换", "订阅"],
        difficulty: "intermediate" as const,
      },
      {
        name: "Clash Dashboard",
        href: "https://github.com/Dreamacro/clash-dashboard",
        note: "Clash 面板",
        scenario: "通过 Web 面板查看连接、日志与节点延迟。",
        tags: ["Web面板", "Clash"],
        difficulty: "beginner" as const,
      },
      {
        name: "yacd-meta",
        href: "https://github.com/MetaCubeX/Yacd-meta",
        note: "Clash Meta 面板",
        scenario: "为 Clash Meta 提供现代化的 Web 管理界面。",
        tags: ["Web面板", "Clash Meta"],
        difficulty: "beginner" as const,
      },
    ],
  },
];

const difficultyBadge = {
  beginner: { label: "新手", className: "border-success/30 text-success bg-success/10" },
  intermediate: { label: "进阶", className: "border-warning/30 text-warning bg-warning/10" },
  advanced: { label: "高阶", className: "border-danger/30 text-danger bg-danger/10" },
};

const commands = [
  {
    title: "curl 测试代理",
    description: "通过指定代理访问 IP 检测服务，快速确认代理可用。",
    code: "curl -x http://ip:port https://ip.sb",
  },
  {
    title: "下载 Clash 订阅",
    description: "用 wget 将 GitHub 上的 Clash 配置文件保存到本地。",
    code: `wget -O clash.yaml ${getSubscriptionUrl("clash")}`,
  },
  {
    title: "验证节点可用性",
    description: "在项目根目录运行脚本，对本地节点进行连通性验证。",
    code: "python3 scripts/update.py --verify",
  },
];

const decisionTree = [
  { role: "新手", icon: User, recommendation: "Clash Verge Rev", note: "跨平台 GUI，导入订阅即可使用" },
  { role: "Android", icon: Smartphone, recommendation: "v2rayNG", note: "Android 最通用的 V2Ray 客户端" },
  { role: "iOS", icon: Apple, recommendation: "Shadowrocket / Stash", note: "付费但稳定，适合日常或高阶" },
  { role: "命令行", icon: Terminal, recommendation: "v2ray / sing-box", note: "核心库与 CLI 工具" },
  { role: "浏览器", icon: Globe, recommendation: "SwitchyOmega / FoxyProxy", note: "按需切换 HTTP/SOCKS 代理" },
];

export default function ToolsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Wrench className="w-3.5 h-3.5" />
          TOOLS
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">工具与生态</h1>
        <p className="text-sm text-muted max-w-2xl">
          除了 FreeNode 提供的订阅，这里整理了各平台常用客户端、浏览器扩展、命令行工具和路由器方案，方便你根据场景组合使用。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-12">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-base">{cat.title}</h2>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4">{cat.description}</p>
              <div className="grid grid-cols-1 gap-3">
                {cat.items.map((item) => {
                  const diff = difficultyBadge[item.difficulty];
                  return (
                    <div
                      key={item.name}
                      className="border border-border bg-background p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          <span
                            className={`shrink-0 text-[10px] px-1.5 py-0.5 border ${diff.className}`}
                          >
                            {diff.label}
                          </span>
                        </div>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border border-primary text-primary hover:bg-primary hover:text-background transition-colors"
                        >
                          官网 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{item.scenario}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 border border-border text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-border bg-surface p-5 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">命令行示例</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {commands.map((cmd) => (
            <div key={cmd.title} className="border border-border bg-background p-4">
              <h3 className="font-medium text-sm mb-1">{cmd.title}</h3>
              <p className="text-xs text-muted mb-3">{cmd.description}</p>
              <div className="relative">
                <pre className="bg-surface border border-border p-3 text-[11px] font-mono overflow-x-auto">
                  <code>{cmd.code}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={cmd.code} label="复制" className="px-2 py-1 text-[10px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border bg-surface p-5 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">工具选择决策树</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decisionTree.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.role} className="border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{item.role}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-muted" />
                  <span className="font-semibold">{item.recommendation}</span>
                </div>
                <p className="text-xs text-muted">{item.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-3">如何选择？</h2>
        <div className="space-y-3 text-sm text-muted mb-5">
          <p>
            <strong className="text-foreground">新手入门：</strong>
            先选择对应平台的 GUI 客户端（Clash Verge Rev、v2rayN、v2rayNG、Shadowrocket），导入 Clash 或 V2Ray 订阅即可使用。
          </p>
          <p>
            <strong className="text-foreground">进阶玩家：</strong>
            可尝试 Sing-box、NekoBox、Quantumult X 等支持更灵活规则与 TUN 模式的工具。
          </p>
          <p>
            <strong className="text-foreground">批量/自动化：</strong>
            使用 FreeNode 的 HTTP(S)/SOCKS4/SOCKS5 代理列表，配合 curl、proxychains-ng 或 subconverter 做二次处理。
          </p>
        </div>
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
            去复制订阅链接
          </Link>
        </div>
      </div>
    </div>
  );
}
