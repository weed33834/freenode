import type { Metadata } from "next";
import {
  CheckCircle2,
  Compass,
  Search,
  Code2,
  Send,
  GitBranch,
  Rss,
  CopyCheck,
  Layers,
  Puzzle,
  PowerOff,
  Handshake,
  Gauge,
  Split,
  Database,
  Share2,
  ShieldAlert,
  Info,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Future Directions — FreeNode",
  description:
    "FreeNode 可探索的扩展方向，涵盖更智能的采集、更智能的验证与运维加固。这些方向已在 v1.3.0 / v1.4.0 落地，本页保留作为能力说明。",
};

// 三组方向，与 docs-site/future-directions.md 对齐
// 每个方向标注实际落地的版本号
const groups = [
  {
    title: "更智能的采集",
    subtitle: "Smarter source collection",
    icon: Search,
    items: [
      {
        label: "GitHub Search API 发现",
        desc: "用 GitHub Search API 搜索 free node 相关仓库，按 stars / 更新时间 / license 过滤，把候选订阅文件输出到审核队列（默认 enabled=false，不自动启用）。",
        version: "v1.3.0",
        icon: Search,
      },
      {
        label: "HTML 页面爬虫",
        desc: "新增 web_html 源类型，下载 HTML 后用 CSS-like selector 提取 <pre>/<code> 块中的 Base64 或链接列表，适配博客与论坛帖子的节点分享。",
        version: "v1.4.0",
        icon: Code2,
      },
      {
        label: "Telegram 频道抓取",
        desc: "用 Telethon（client API，非 bot API）抓取频道历史消息，从消息文本或附件文件提取节点链接，限速 1 msg/s 防封禁。",
        version: "v1.4.0",
        icon: Send,
      },
      {
        label: "Git 仓库克隆",
        desc: "新增 git_repo 源类型，git clone --depth 1 到临时目录，glob 匹配 *.yaml / *.txt / *.base64 多文件后走统一解析，运行后清理。",
        version: "v1.4.0",
        icon: GitBranch,
      },
      {
        label: "RSS / Atom feeds",
        desc: "新增 rss 源类型，feedparser 解析订阅，从 <description> / <content:encoded> 提取节点链接，按 last_updated 跳过未更新条目，节省轮询成本。",
        version: "v1.4.0",
        icon: Rss,
      },
      {
        label: "跨源指纹去重",
        desc: "在 verify 之前按 (protocol, server, port, auth_secret) 内容指纹去重，解决多源镜像同一节点字符串不同导致的漏去重，砍掉重复候选。",
        version: "v1.3.0",
        icon: CopyCheck,
      },
      {
        label: "协议覆盖扩展",
        desc: "新增 hysteria / hysteria2 / tuic 协议解析器与 Clash 输出，覆盖 sing-box / mihomo 支持的现代协议，从 SKIPPED_SCHEMES 移到 OUTPUT_SCHEMES。",
        version: "v1.3.0",
        icon: Layers,
      },
      {
        label: "源适配器插件 API",
        desc: "定义 SourceAdapter 协议（fetch + parse），按 sources.json 的 type 字段分发，外部包可通过 entry points 注册适配器，无需 fork 即可扩展。",
        version: "v1.4.0",
        icon: Puzzle,
      },
      {
        label: "自动禁用低分源",
        desc: "在 crawl 时跳过 14 天 reliability 低于阈值的源（FREENODE_RELIABILITY_FLOOR，默认 0 不启用），sources.json 标 force_enabled: true 可强制保留。",
        version: "v1.3.0",
        icon: PowerOff,
      },
    ],
  },
  {
    title: "更智能的验证",
    subtitle: "Smarter verification",
    icon: Handshake,
    items: [
      {
        label: "协议级握手验证",
        desc: "TCP connect 后做协议级二段验证：trojan 走 TLS 握手，ss 发探测字节检测立即 RST，vmess/vless/hysteria/tuic 走 TCP 层。生存信号比单纯端口连通更准。",
        version: "v1.4.0",
        icon: Handshake,
      },
      {
        label: "延迟排序与分协议订阅",
        desc: "存活节点按 latency_ms 升序输出，并按协议生成独立 Clash 文件（nodes/clash-vmess.yaml 等），客户端可按需挑选协议或地区，避免选到慢节点。",
        version: "v1.4.0",
        icon: Gauge,
      },
    ],
  },
  {
    title: "运维加固",
    subtitle: "Operational hardening",
    icon: ShieldAlert,
    items: [
      {
        label: "拆分 crawl / verify 调度",
        desc: "拆出 run_verify_pipeline 只复验 DB 已有节点不重新 crawl，verify_alive 每 30 分钟复验存活节点，verify_dead 每 6 小时给死节点复活机会，full_refresh 每天跑全量。",
        version: "v1.3.0",
        icon: Split,
      },
      {
        label: "PostgreSQL 支持",
        desc: "FREENODE_DATABASE_URL 接受任意 SQLAlchemy URL，docker-compose 加 postgres:16-alpine sidecar（带 healthcheck + 持久化 volume），文档补充切换三步法，适配多 worker 并发写入。",
        version: "v1.4.0",
        icon: Database,
      },
      {
        label: "去中心化分发",
        desc: "把 nodes/ 发布到 IPFS Pinata / Cloudflare R2 / 本地目录，生成 mirrors.json 清单，某镜像失败不影响其他，客户端可自动回退，GitHub/GitCode 仍为主分发渠道。",
        version: "v1.4.0",
        icon: Share2,
      },
      {
        label: "安全审计",
        desc: "审计 SSRF / 内存爆炸 / 资源泄漏 / 密钥 / 注入 5 个维度，发现 15 项问题（2 High / 4 Medium / 5 Low / 4 Info），逐项修复并补 fuzz 与边界检测。",
        version: "v1.4.0",
        icon: ShieldAlert,
      },
    ],
  },
];

export default function FutureDirectionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Compass className="w-3.5 h-3.5" />
          FUTURE DIRECTIONS
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">未来方向</h1>
        <p className="text-sm text-muted max-w-2xl">
          这些是 FreeNode 可探索的扩展方向，<span className="text-foreground">非承诺</span>——
          每个方向写明动机与工作轮廓，方便社区成员判断是否参与。落地情况以实际版本为准，欢迎在
          <a
            href="https://github.com/MS33834/freenode/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover mx-1"
          >
            GitHub Issues
          </a>
          讨论新的扩展方向。
        </p>
      </div>

      {/* 已落地提示框：所有方向已在 v1.3.0 / v1.4.0 实现，本页作为能力说明保留 */}
      <div className="mb-10 border border-success/30 bg-success/10 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <p className="font-medium text-foreground mb-1">本页方向已全部落地</p>
            <p className="text-muted">
              以下方向已在 <span className="font-mono text-success">v1.3.0</span> 与{" "}
              <span className="font-mono text-success">v1.4.0</span> 全部实现，本页保留作为能力说明。
              新的扩展方向欢迎在{" "}
              <a
                href="https://github.com/MS33834/freenode/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover"
              >
                GitHub Issues
              </a>{" "}
              讨论。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section key={group.title}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-1.5 border border-border text-primary">
                  <GroupIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{group.title}</h2>
                  <p className="text-xs text-muted font-mono">{group.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-1.5 border border-border text-primary inline-flex">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border text-success bg-success/10 border-success/20 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          已完成
                        </span>
                      </div>
                      <h3 className="text-sm font-medium mb-2">{item.label}</h3>
                      <p className="text-xs text-muted leading-relaxed mb-3">
                        {item.desc}
                      </p>
                      <p className="text-[10px] font-mono text-success">
                        已在 {item.version} 实现
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 border border-border bg-surface p-5">
        <h2 className="font-medium text-sm mb-3">状态图例</h2>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-success/20 text-success bg-success/10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已完成
          </span>
        </div>
      </div>
    </div>
  );
}
