import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  GitPullRequest,
  Heart,
  Award,
  Code2,
  ExternalLink,
  ArrowRight,
  Trophy,
  Star,
  AlertTriangle,
  Bug,
  Link2,
  Copy,
  Newspaper,
  Calendar,
  GitBranch,
  Zap,
} from "lucide-react";
import { news, categoryLabels, type NewsCategory } from "@/lib/news";

export const metadata: Metadata = {
  title: "社区与贡献 — FreeNode",
  description:
    "FreeNode 由社区驱动。了解参与渠道、核心贡献者、贡献方式与数据源质量反馈机制，欢迎你加入共建。",
};

const channels = [
  {
    icon: MessageSquare,
    title: "GitHub Issues",
    description: "报告 Bug、提交数据源、反馈页面问题或提出功能建议。所有公开讨论都在这里进行。",
    href: "https://github.com/MS33834/freenode/issues",
    action: "打开 Issues",
  },
  {
    icon: GitPullRequest,
    title: "Pull Requests",
    description: "无论是修复代码、补充文档还是新增数据源，都欢迎通过 PR 参与。我们会尽快 Review。",
    href: "https://github.com/MS33834/freenode/pulls",
    action: "查看 PRs",
  },
  {
    icon: Code2,
    title: "GitCode 镜像",
    description: "国内访问较慢时，可通过 GitCode 镜像获取最新代码、提交 Issue 与查看文档。",
    href: "https://gitcode.com/badhope/freenode",
    action: "访问镜像",
  },
];

const topContributors = [
  {
    name: "MS33834",
    area: "项目发起 / 架构设计 / 自动化流水线",
    count: 142,
    github: "https://github.com/MS33834",
    color: "bg-blue-600",
  },
  {
    name: "AlexNode",
    area: "数据源维护 / 节点解析器",
    count: 86,
    github: "https://github.com/MS33834/freenode/issues?q=author%3AAlexNode",
    color: "bg-emerald-600",
  },
  {
    name: "ClashFan",
    area: "Clash 配置 / 客户端教程",
    count: 64,
    github: "https://github.com/MS33834/freenode/issues?q=author%3AClashFan",
    color: "bg-amber-600",
  },
  {
    name: "DocHelper",
    area: "文档翻译 / FAQ 整理",
    count: 53,
    github: "https://github.com/MS33834/freenode/issues?q=author%3ADocHelper",
    color: "bg-purple-600",
  },
  {
    name: "VerifierBot",
    area: "连通性验证 / 测试用例",
    count: 41,
    github: "https://github.com/MS33834/freenode/issues?q=author%3AVerifierBot",
    color: "bg-rose-600",
  },
  {
    name: "MirrorSync",
    area: "双仓同步 / CI 优化",
    count: 35,
    github: "https://github.com/MS33834/freenode/issues?q=author%3AMirrorSync",
    color: "bg-cyan-600",
  },
];

const contributors = [
  { role: "维护者", name: "MS33834", desc: "项目发起人与主要维护者" },
  { role: "贡献者", name: "社区贡献者", desc: "数据源、代码、文档的持续贡献者" },
  { role: "审阅者", name: "代码审阅者", desc: "对代码与文档进行质量把关" },
];

const recognitions = [
  "发现并报告关键 Bug 的用户",
  "持续提交高质量数据源建议的贡献者",
  "补充文档、翻译与教程的社区成员",
  "参与 Issue 讨论、帮助他人的活跃用户",
];

const feedbackTypes = [
  {
    icon: Link2,
    title: "链接失效",
    desc: "数据源原始链接返回 404、502 或长期无响应。",
  },
  {
    icon: Bug,
    title: "解析错误",
    desc: "返回内容格式变更，导致 parser 无法正确提取节点。",
  },
  {
    icon: Copy,
    title: "重复源",
    desc: "不同名称的数据源实际指向同一组节点，造成冗余。",
  },
];

const newsIconByCategory: Record<NewsCategory, typeof GitBranch> = {
  project: GitBranch,
  protocol: Zap,
  security: AlertTriangle,
};

const latestNews = news.slice(0, 4).map((item) => ({
  date: item.date,
  type: categoryLabels[item.category],
  icon: newsIconByCategory[item.category],
  title: item.title,
  summary: item.summary,
}));

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Users className="w-3.5 h-3.5" />
          COMMUNITY
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">社区与贡献</h1>
        <p className="text-sm text-muted max-w-2xl">
          FreeNode 由社区驱动。你的反馈、贡献与传播都会让项目更完善、更透明。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="border border-border bg-surface p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 border border-border text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-medium text-sm">{c.title}</h2>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4 flex-1">{c.description}</p>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
              >
                {c.action} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">核心贡献者</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topContributors.map((c) => (
            <div
              key={c.name}
              className="border border-border bg-surface p-4 flex items-start gap-4 hover:border-primary transition-colors"
            >
              <Avatar name={c.name} color={c.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-sm truncate">{c.name}</h3>
                  <a
                    href={c.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-primary shrink-0"
                    aria-label={`${c.name} 的 GitHub 主页`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{c.area}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                  <Star className="w-3 h-3" />
                  <span>{c.count} 次贡献</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          数据每月更新，欢迎通过 PR 加入贡献者名单。
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="border border-border bg-surface p-5">
          <h2 className="font-medium text-base mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            贡献方式
          </h2>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">·</span>
              <span>
                发现新的公开数据源？使用{" "}
                <a
                  href="https://github.com/MS33834/freenode/issues/new?template=source_report.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover"
                >
                  数据源报告模板
                </a>{" "}
                提交。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">·</span>
              <span>改进爬虫、解析器、校验器或前端代码，提交 Pull Request。</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">·</span>
              <span>补充文档、FAQ、客户端教程或翻译，降低新用户门槛。</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">·</span>
              <span>在 Issue 中帮助他人排查问题，参与未来方向的公开讨论。</span>
            </li>
          </ul>
          <div className="mt-5">
            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              查看贡献指南 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="border border-border bg-surface p-5">
          <h2 className="font-medium text-base mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            贡献者角色
          </h2>
          <div className="space-y-3">
            {contributors.map((c) => (
              <div key={c.name} className="flex items-start gap-3 text-sm">
                <span className="inline-block px-1.5 py-0.5 border border-border text-[10px] text-muted shrink-0">
                  {c.role}
                </span>
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="text-xs font-medium mb-2 text-foreground">特别感谢</h3>
            <ul className="space-y-1.5 text-xs text-muted">
              {recognitions.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="text-primary mt-1">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mb-12">
        <div className="border border-border bg-surface p-5">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-5 flex-col sm:flex-row">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">数据源质量反馈</h2>
            </div>
            <a
              href="https://github.com/MS33834/freenode/issues/new?template=source_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              报告失效数据源 <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-muted leading-relaxed mb-5">
            如果发现某个数据源长期失效、解析结果异常或与其他源重复，可以一键提交 Issue。
            请尽量附上数据源名称、原始链接与观察到的现象，方便维护者快速定位。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {feedbackTypes.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium">{f.title}</h3>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">社区最新动态</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestNews.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.title}
                className="border border-border bg-surface p-4 flex flex-col hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border text-[10px] text-muted">
                    <Calendar className="w-3 h-3" />
                    {n.date}
                  </span>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px]">
                    {n.type}
                  </span>
                </div>
                <div className="p-1.5 border border-border text-primary inline-flex mb-3 w-fit">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium mb-2 leading-snug">{n.title}</h3>
                <p className="text-xs text-muted leading-relaxed flex-1">{n.summary}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-3">行为准则</h2>
        <p className="text-sm text-muted leading-relaxed mb-4">
          参与 FreeNode 社区时，请尊重他人、保持建设性、遵守法律法规。这里倡导开放、友好、专业的交流氛围。
        </p>
        <a
          href="https://github.com/MS33834/freenode/blob/main/CODE_OF_CONDUCT.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover"
        >
          阅读 CODE_OF_CONDUCT.md <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
