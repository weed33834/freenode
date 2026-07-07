import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = {
  title: "参与贡献 — FreeNode",
  description:
    "FreeNode 是社区驱动的开源项目，欢迎提交数据源、改进代码、完善文档与翻译，附数据源提交模板。",
};
import {
  GitPullRequest,
  Database,
  Code2,
  FileText,
  Languages,
  MessageSquare,
  ExternalLink,
  Heart,
} from "lucide-react";

const REPO_URL = "https://github.com/MS33834/freenode";
const ISSUES_URL = "https://github.com/MS33834/freenode/issues";
const SOURCE_ISSUE_URL = "https://github.com/MS33834/freenode/issues/new?template=source_report.md";

const ways = [
  {
    icon: Database,
    title: "提交新数据源",
    desc: "发现新的公开节点/代理源？按下方模板填写信息，在 GitHub Issues 中提交，我们会评估后合并到 config/sources.json。",
    action: "提交数据源",
    href: SOURCE_ISSUE_URL,
  },
  {
    icon: Code2,
    title: "改进代码",
    desc: "爬虫、解析器、校验器、格式化输出都有优化空间。欢迎提交 Pull Request，改进性能、稳定性或增加新协议支持。",
    action: "查看代码",
    href: REPO_URL,
  },
  {
    icon: FileText,
    title: "完善文档",
    desc: "帮助补充客户端教程、FAQ、架构说明。文档位于 docs-site/ 与 web/ 目录，修改后可直接发起 PR。",
    action: "浏览文档",
    href: `${REPO_URL}/tree/main/docs-site`,
  },
  {
    icon: Languages,
    title: "翻译",
    desc: "FreeNode 计划逐步支持英文界面。你可以从页面文案、README 与文档开始翻译。",
    action: "参与翻译",
    href: ISSUES_URL,
  },
  {
    icon: MessageSquare,
    title: "反馈问题",
    desc: "遇到节点失效、页面错误、链接无法访问？在 GitHub Issues 中描述复现步骤，我们会尽快跟进。",
    action: "提交 Issue",
    href: ISSUES_URL,
  },
];

const sourceTemplate = `## 数据源提交模板

- **名称：** （简短标识，如 example-free-v2ray）
- **URL：** （公开可访问的 raw 链接）
- **协议：** （VLESS / VMess / Trojan / Shadowsocks / HTTP / HTTPS / SOCKS4 / SOCKS5 等）
- **更新频率：** （daily / hourly / 30min / 其他）
- **来源类型：** （github_raw / web_url / base64_subscription）
- **是否需要 Base64 解码：** （是 / 否）
- **说明：** （数据质量、稳定性、是否需要特殊网络环境等）
- **是否可公开抓取：** 是（必须公开且遵守对方 robots.txt / 服务条款）
`;

export default function ContributePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Heart className="w-3.5 h-3.5" />
          CONTRIBUTE
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">参与贡献</h1>
        <p className="text-sm text-muted max-w-2xl">
          FreeNode 是社区驱动的开源项目。无论是提交新数据源、改进代码、完善文档还是翻译，都欢迎参与。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {ways.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="border border-border bg-surface p-5 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-medium text-sm">{item.title}</h2>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4 flex-1">
                {item.desc}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover"
              >
                {item.action} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="border border-border bg-surface p-5">
          <h2 className="font-medium text-base mb-4 flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-primary" />
            贡献流程
          </h2>
          <ol className="space-y-3 text-sm text-muted">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 border border-primary text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              Fork 仓库并创建特性分支。
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 border border-primary text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              按项目规范修改代码、配置或文档。
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 border border-primary text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              本地运行测试与构建，确保无错误。
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 border border-primary text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              提交 Pull Request，描述改动原因与测试结果。
            </li>
          </ol>
        </div>

        <div className="border border-border bg-surface p-5">
          <h2 className="font-medium text-base mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            数据源提交模板
          </h2>
          <p className="text-xs text-muted mb-3">
            提交新数据源时，请复制下方模板并填写完整信息。也可以先阅读
            <Link href="/sources/guide" className="text-primary hover:text-primary-hover mx-1">
              数据源贡献指南
            </Link>
            了解收录标准与格式要求。
          </p>
          <div className="relative">
            <textarea
              readOnly
              value={sourceTemplate}
              aria-label="数据源提交模板"
              className="w-full h-56 bg-background border border-border p-3 text-xs font-mono text-muted resize-none focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <div className="absolute top-2 right-2">
              <CopyButton text={sourceTemplate} label="复制模板" />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface p-6">
        <h2 className="font-medium text-base mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          快速链接
        </h2>
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Code2 className="w-4 h-4" /> 访问 GitHub 仓库
          </a>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> 提交 Issue
          </a>
          <Link
            href="/architecture"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <FileText className="w-4 h-4" /> 了解架构
          </Link>
        </div>
      </div>
    </div>
  );
}
