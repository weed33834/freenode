import type { Metadata } from "next";
import Link from "next/link";
import { getSubscriptionUrl } from "@/lib/api";

export const metadata: Metadata = {
  title: "订阅中心 — FreeNode",
  description:
    "选择 Clash / V2Ray / HTTP(S)/SOCKS4/SOCKS5 订阅格式，复制链接并导入客户端；包含镜像切换、格式说明与导入示例。",
};
import { SubscribeCard } from "@/components/subscribe-card";
import { CopyButton } from "@/components/copy-button";
import { StepCard } from "@/components/step-card";
import {
  AlertTriangle,
  QrCode,
  Server,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Filter,
  Gauge,
  Puzzle,
  Terminal,
  Router,
} from "lucide-react";

const steps = [
  {
    title: "选择格式",
    description: "Clash 格式适合 Clash 系列客户端；V2Ray 格式适合 v2rayN/v2rayNG/Shadowrocket 等；HTTP(S)/SOCKS4/SOCKS5 适合浏览器扩展或爬虫。",
  },
  {
    title: "切换镜像",
    description: "根据你的网络环境选择 GitHub Raw 或 GitCode Raw。GitCode 在国内访问通常更稳定。",
  },
  {
    title: "复制订阅链接",
    description: "点击卡片中的复制按钮，将订阅地址保存到剪贴板。",
  },
  {
    title: "导入客户端",
    description: "在客户端订阅设置中粘贴链接并更新。不同客户端的具体操作可查看客户端教程页。",
  },
];

const recommendations = [
  {
    icon: Server,
    title: "Clash 用户",
    clients: "Clash Verge Rev / Clash Meta / Clash for Windows",
    tip: "复制 Clash 订阅，粘贴到 Profiles / 订阅 页面。",
  },
  {
    icon: Globe,
    title: "V2Ray 用户",
    clients: "v2rayN / v2rayNG / Shadowrocket / NekoBox",
    tip: "复制 V2Ray 订阅，在订阅设置中粘贴并更新。",
  },
  {
    icon: Layers,
    title: "临时/爬虫",
    clients: "SwitchyOmega / FoxyProxy / curl / Python requests",
    tip: "复制 HTTP(S)/SOCKS4/SOCKS5 列表，按需提取单个代理使用。",
  },
  {
    icon: Puzzle,
    title: "浏览器扩展用户",
    clients: "SwitchyOmega + HTTP代理",
    tip: "复制 HTTP(S) 列表，在扩展中添加情景模式并选择单个代理。",
  },
  {
    icon: Terminal,
    title: "自动化 / 爬虫用户",
    clients: "Python requests + 代理列表",
    tip: "按行读取代理列表，随机或轮询选择节点，配合异常重试使用。",
  },
  {
    icon: Router,
    title: "路由器用户",
    clients: "OpenClash + Clash订阅",
    tip: "将 Clash 订阅导入 OpenClash，启用后全屋设备自动分流。",
  },
];

const notes = [
  "订阅链接每日 UTC 02:00 自动更新，建议客户端开启自动更新。",
  "免费节点时效性强，如遇大面积失效请等待次日更新或切换镜像。",
  "请勿在免费节点环境下登录银行、支付、社交等敏感账户。",
];

export default function SubscribePage() {
  // 订阅链接由后端 /api/subscriptions/* 动态生成
  const clashUrl = getSubscriptionUrl("clash");
  const v2rayUrl = getSubscriptionUrl("v2ray");
  const proxiesUrl = getSubscriptionUrl("plain");

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">订阅中心</h1>
        <p className="text-sm text-muted max-w-2xl">
          选择你的客户端格式，复制订阅链接即可导入。建议优先使用 GitHub Raw，如遇网络问题可切换 GitCode 镜像。
        </p>
      </div>

      <div className="border border-warning/20 bg-warning/10 p-3 mb-8 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="text-warning">安全提示：</strong>
          免费节点来自公开渠道，不保证安全与隐私。请勿在连接节点期间登录银行、支付、社交等敏感账户。
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <SubscribeCard
          title="Clash"
          description="适用于 Clash Verge、Clash Meta、Clash for Windows、Stash、Surge 等 Clash 内核客户端。"
          url={clashUrl}
          icon={<Server className="w-5 h-5" />}
        />
        <SubscribeCard
          title="V2Ray"
          description="适用于 v2rayN、v2rayNG、Shadowrocket、NekoBox、Quantumult X 等支持 V2Ray 订阅的客户端。"
          url={v2rayUrl}
          icon={<Globe className="w-5 h-5" />}
        />
        <SubscribeCard
          title="HTTP(S) / SOCKS4 / SOCKS5"
          description="公开代理列表，适用于浏览器扩展、爬虫、curl、Python requests 等场景。"
          url={proxiesUrl}
          icon={<Layers className="w-5 h-5" />}
        />
      </div>

      <div className="border border-border bg-surface p-5 mb-12">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          如何选择节点
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="border border-border bg-background p-4">
            <h3 className="font-medium text-sm mb-2">看协议</h3>
            <p className="text-xs text-muted leading-relaxed">
              Clash 适合规则分流，V2Ray 适合多协议客户端。按你的客户端选择对应订阅格式。
            </p>
          </div>
          <div className="border border-border bg-background p-4">
            <h3 className="font-medium text-sm mb-2">看地区</h3>
            <p className="text-xs text-muted leading-relaxed">
              优先选择距离近的地区（如香港/日本/新加坡），通常延迟更低、速度更稳定。
            </p>
          </div>
          <div className="border border-border bg-background p-4">
            <h3 className="font-medium text-sm mb-2">看验证</h3>
            <p className="text-xs text-muted leading-relaxed">
              状态页可查看最近一次验证通过率，优先选择通过率较高的时段导入。
            </p>
          </div>
        </div>
        <Link
          href="/status"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors"
        >
          查看节点验证状态 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="border border-border bg-surface p-5 mb-12">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          格式说明与导入示例
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> Clash
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-3">
              YAML 格式，包含 proxies、proxy-groups 与 rules。适合所有 Clash 内核客户端。导入后选择节点并开启系统代理即可。
            </p>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={clashUrl}
                aria-label="Clash 订阅链接"
                className="flex-1 min-w-0 bg-background border border-border px-2 py-1.5 text-[10px] font-mono text-muted truncate focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <CopyButton text={clashUrl} label="复制" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> V2Ray
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Base64 编码的 vmess/vless/ss/trojan 链接集合。v2rayN、v2rayNG、Shadowrocket 等客户端均可通过订阅功能导入。
            </p>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={v2rayUrl}
                aria-label="V2Ray 订阅链接"
                className="flex-1 min-w-0 bg-background border border-border px-2 py-1.5 text-[10px] font-mono text-muted truncate focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <CopyButton text={v2rayUrl} label="复制" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> HTTP(S) / SOCKS4 / SOCKS5
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-3">
              纯文本代理列表，每行一个代理。可直接用于浏览器扩展、curl --proxy 或 Python requests，按需提取单个地址。
            </p>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={proxiesUrl}
                aria-label="HTTP(S) / SOCKS4 / SOCKS5 代理列表链接"
                className="flex-1 min-w-0 bg-background border border-border px-2 py-1.5 text-[10px] font-mono text-muted truncate focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <CopyButton text={proxiesUrl} label="复制" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        <div>
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            使用步骤
          </h2>
          <div>
            {steps.map((s, index) => (
              <StepCard key={s.title} step={index + 1} {...s} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-5">推荐搭配</h2>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.title}
                className="border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 border border-border text-primary">
                    <rec.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{rec.title}</h3>
                    <p className="text-[10px] text-muted">{rec.clients}</p>
                  </div>
                </div>
                <p className="text-xs text-muted">{rec.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface p-4 mb-10">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          如何自己测速
        </h2>
        <ul className="space-y-2 text-xs text-muted mb-4">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            Clash Verge / v2rayN 等客户端内置测速，更新订阅后点击「测试全部节点」即可。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            建议测试 3-5 个节点后选择延迟最低的，实际速度还与你的网络环境有关。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            免费节点速度会随时间波动，遇到慢或断连时重新测速并切换即可。
          </li>
        </ul>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors"
        >
          查看客户端测速教程 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="border border-border bg-surface p-4 mb-10">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          使用须知
        </h2>
        <ul className="space-y-2 text-xs text-muted">
          {notes.map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-left">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          查看详细客户端教程 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
