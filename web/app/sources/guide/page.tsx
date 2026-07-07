import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  FileText,
  ExternalLink,
  ArrowRight,
  Globe,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "数据源贡献指南 — FreeNode",
  description:
    "了解 FreeNode 收录数据源的条件与提交步骤，学习如何贡献新的公开节点或代理源。",
};

const requirements = [
  {
    icon: Globe,
    title: "公开可访问",
    description: "数据源必须是互联网上公开可访问的 URL，不需要登录、付费或特殊授权即可获取。",
  },
  {
    icon: CheckCircle2,
    title: "持续更新",
    description: "最好有明确的更新记录或自动化工作流，例如 GitHub Actions 每日/每小时提交。",
  },
  {
    icon: FileText,
    title: "格式兼容",
    description: "目前支持：v2ray Base64 订阅、纯文本 vmess/vless/ss/trojan 链接、HTTP(S)/SOCKS4/SOCKS5 ip:port 列表。",
  },
  {
    icon: Shield,
    title: "合法合规",
    description: "数据源内容需遵守当地法律法规，不得包含恶意软件、钓鱼或侵犯隐私的节点。",
  },
];

const steps = [
  "Fork 本仓库并切换到新分支，例如 feat/add-source-example。",
  "编辑 config/sources.json，在 free_node_sources 或 free_proxy_apis 中添加条目。",
  "确保填写 name、url、enabled、protocols、update_interval 和 note。",
  "如果是代理列表（ip:port），请添加 proxy_scheme 字段（http/socks4/socks5）。",
  "本地运行 python3 scripts/update.py 验证能否成功抓取并解析。",
  "提交 Pull Request，并在描述中说明数据源来源、更新频率和测试结果。",
];

export default function SourceGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Database className="w-3.5 h-3.5" />
          DATA SOURCE GUIDE
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">数据源贡献指南</h1>
        <p className="text-sm text-muted">
          了解 FreeNode 如何收录数据源、需要满足什么条件，以及如何提交新的公开节点或代理源。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {requirements.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title} className="border border-border bg-surface p-5">
              <div className="p-1.5 border border-border text-primary inline-flex mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-medium text-sm mb-2">{r.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{r.description}</p>
            </div>
          );
        })}
      </div>

      <div className="border border-border bg-surface p-6 mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-primary" />
          提交步骤
        </h2>
        <ol className="space-y-3 text-sm text-muted list-decimal pl-5">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="border border-border bg-surface p-6 mb-10">
        <h2 className="text-lg font-semibold mb-4">配置示例</h2>
        <pre className="bg-background border border-border p-4 overflow-x-auto text-xs font-mono leading-relaxed">
          {`{
  "name": "example-free-v2ray",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/subscription.txt",
  "enabled": true,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss", "trojan"],
  "note": "Daily updated mixed-protocol subscription (Base64)."
}`}
        </pre>
        <p className="text-xs text-muted mt-3">
          代理列表示例需额外添加 <code className="text-primary">&quot;proxy_scheme&quot;: &quot;http&quot;</code>。
        </p>
      </div>

      <div className="border border-warning/20 bg-warning/10 p-4 flex items-start gap-3 mb-10">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        <div>
          <h3 className="font-medium text-warning text-sm mb-1">审核说明</h3>
          <p className="text-xs text-muted leading-relaxed">
            维护者会审核数据源的可用性、更新频率和合规性。对于过大、过慢或来源不明的源，我们可能会默认禁用并要求补充说明。
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-3">
        <a
          href="https://github.com/MS33834/freenode/issues/new?template=source_report.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          提交数据源 <ExternalLink className="w-4 h-4" />
        </a>
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-surface text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          返回数据源页面 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
