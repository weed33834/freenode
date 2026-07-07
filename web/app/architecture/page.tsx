import type { Metadata } from "next";
import {
  Settings,
  Download,
  Puzzle,
  Activity,
  FileJson,
  Workflow,
  GitBranch,
  Globe,
  ArrowRight,
  Cpu,
} from "lucide-react";

export const metadata: Metadata = {
  title: "架构说明 — FreeNode",
  description:
    "从数据源配置到自托管部署的端到端流水线说明，所有脚本与配置均开源可复现。",
};

const pipeline = [
  {
    title: "数据源配置",
    desc: "在 config/sources.json 中维护所有公开数据源，支持启用/禁用、Base64 解码、更新频率与协议标签。",
    files: ["config/sources.json"],
    icon: Settings,
  },
  {
    title: "爬虫抓取",
    desc: "scripts/crawler.py 并发拉取所有启用源，自动跳过过大文件与不可达链接，并将原始内容暂存。",
    files: ["scripts/crawler.py"],
    icon: Download,
  },
  {
    title: "解析节点",
    desc: "scripts/parser.py 提取 VLESS、VMess、Trojan、Shadowsocks 与 HTTP(S)/SOCKS4/SOCKS5 链接，完成去重与格式标准化。",
    files: ["scripts/parser.py"],
    icon: Puzzle,
  },
  {
    title: "验证存活",
    desc: "scripts/verifier.py 执行 TCP 连通性校验，过滤明显不可用的节点。CI 每日默认启用 --verify，本地可关闭以加速测试。",
    files: ["scripts/verifier.py"],
    icon: Activity,
  },
  {
    title: "格式化输出",
    desc: "scripts/formatter.py 将节点转换为 Clash YAML、V2Ray 订阅与 HTTP(S)/SOCKS4/SOCKS5 代理列表，写入 nodes/ 目录。",
    files: ["scripts/formatter.py", "nodes/clash.yaml", "nodes/v2ray.txt", "nodes/proxies.txt"],
    icon: FileJson,
  },
  {
    title: "GitHub Actions 定时更新",
    desc: ".github/workflows/update-nodes.yml 每天 UTC 02:00 触发完整流水线，生成最新节点文件。",
    files: [".github/workflows/update-nodes.yml"],
    icon: Workflow,
  },
  {
    title: "双仓库同步",
    desc: "更新完成后同时推送 GitHub 主仓库与 GitCode 镜像，保证国内/海外用户都能稳定拉取订阅。",
    files: [".github/workflows/update-nodes.yml"],
    icon: GitBranch,
  },
  {
    title: "Docker 自托管部署",
    desc: "backend/docker-compose.yml 用 Caddy 反代 Next.js 前端与 FastAPI 后端，自动签发 HTTPS 证书；文档站由 deploy-docs.yml 部署到 GitHub Pages。",
    files: ["backend/docker-compose.yml", "backend/Caddyfile", ".github/workflows/deploy-docs.yml"],
    icon: Globe,
  },
];

export default function ArchitecturePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Cpu className="w-3.5 h-3.5" />
          ARCHITECTURE
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">架构说明</h1>
        <p className="text-sm text-muted max-w-2xl">
          整条流水线从数据源到用户界面完全自动化，所有脚本与配置均开源。你可以直接查看、修改或替换任何环节。
        </p>
      </div>

      <div className="space-y-4">
        {pipeline.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === pipeline.length - 1;
          return (
            <div key={step.title}>
              <div className="border border-border bg-surface p-5 flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex items-center gap-4 shrink-0 md:w-48">
                  <div className="w-8 h-8 border border-primary text-primary text-sm font-medium flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="p-2 border border-border text-primary md:hidden">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 border border-border text-primary hidden md:block">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="font-medium text-base">{step.title}</h2>
                  </div>
                  <p className="text-sm text-muted leading-relaxed mb-3">
                    {step.desc}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.files.map((file) => (
                      <code
                        key={file}
                        className="px-2 py-1 bg-background border border-border text-[10px] font-mono text-muted"
                      >
                        {file}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="w-4 h-4 text-muted rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 border border-border bg-surface p-5">
        <h2 className="font-medium text-sm mb-3">设计原则</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            <span>
              <strong className="text-foreground">透明：</strong>
              每个数据源的 URL、协议与更新频率全部公开。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            <span>
              <strong className="text-foreground">可复现：</strong>
              本地执行 <code className="px-1 py-0.5 bg-background border border-border text-[10px] font-mono text-muted">python3 scripts/update.py</code> 即可跑完整条流水线。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            <span>
              <strong className="text-foreground">可扩展：</strong>
              新增数据源只需修改 JSON，新增协议只需扩展解析器。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">·</span>
            <span>
              <strong className="text-foreground">低成本：</strong>
              完全依赖 GitHub Actions，无需租用服务器。
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
