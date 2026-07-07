import type { Metadata } from "next";
import {
  AlertTriangle,
  Scale,
  Shield,
  Users,
  Gavel,
  Eye,
  Ban,
} from "lucide-react";

export const metadata: Metadata = {
  title: "免责声明 — FreeNode",
  description:
    "使用 FreeNode 前请阅读免责声明：项目性质、安全隐私风险、用户责任、使用条款与法律合规提示。",
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 border border-warning/20 bg-warning/10 text-warning mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">免责声明</h1>
        <p className="text-sm text-muted">使用 FreeNode 前，请务必仔细阅读以下条款。</p>
      </div>

      <div className="space-y-4">
        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">项目性质</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            FreeNode 是一个开源的教育研究项目，旨在帮助用户学习网络协议、安全测试和隐私技术。
            本项目不生产、不运营任何代理或 VPN 节点，所有节点和代理列表均来自互联网公开渠道。
            我们仅对公开数据进行格式转换、聚合与再分发。
          </p>
        </section>

        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">安全与隐私风险</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc list-inside">
            <li>免费公开节点不保证可用性、稳定性、安全性与隐私性。</li>
            <li>节点运营者可能查看、记录、篡改或注入你的网络流量。</li>
            <li>部分节点可能是蜜罐、钓鱼或恶意服务器，存在数据泄露风险。</li>
            <li>使用免费节点时，请勿登录银行、支付、社交、邮箱等敏感账户。</li>
            <li>请勿通过免费节点传输个人隐私、商业机密或受法律保护的信息。</li>
          </ul>
        </section>

        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">用户责任</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc list-inside">
            <li>用户应自行判断节点来源的可信度，并承担使用风险。</li>
            <li>用户应遵守所在国家/地区的法律法规，合法使用本项目。</li>
            <li>未成年人应在监护人指导下使用本项目。</li>
            <li>项目维护者不对任何直接或间接损失承担责任。</li>
          </ul>
        </section>

        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">使用条款与限制</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc list-inside">
            <li>本项目仅用于学习网络协议、安全测试和隐私技术研究。</li>
            <li>禁止将本项目用于任何违反法律法规、侵犯他人权益或逃避网络监管的活动。</li>
            <li>禁止大规模爬取、重新分发或商业化销售本项目的节点数据。</li>
            <li>用户应自行承担因使用公开节点而产生的全部风险与责任。</li>
            <li>维护者保留随时修改数据源、移除违规内容或终止服务的权利。</li>
          </ul>
        </section>

        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">数据与隐私</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc list-inside">
            <li>本项目不收集、不存储用户的连接日志与访问记录。</li>
            <li>第三方节点运营者可能查看、记录或分析你的流量，我们无法控制。</li>
            <li>前端站点为自托管部署（Docker + Caddy），仅记录常规访问日志；文档站托管在 GitHub Pages。</li>
          </ul>
        </section>

        <section className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">禁止行为</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc list-inside">
            <li>不得使用本项目节点从事网络攻击、垃圾邮件、欺诈或骚扰行为。</li>
            <li>不得将节点用于访问、传播或存储非法内容。</li>
            <li>不得对本项目托管服务进行滥用式请求或资源耗尽攻击。</li>
          </ul>
        </section>

        <section className="border border-warning/20 bg-warning/10 p-5">
          <h2 className="text-base font-semibold text-warning mb-2">法律合规提示</h2>
          <p className="text-sm text-muted leading-relaxed">
            在某些司法管辖区，使用、分发或提供代理/VPN 节点可能受到限制。请在使用前了解并遵守当地法律。
            如果你发现本项目中包含侵犯你权益或违反法律的内容，请通过 GitHub Issues 联系我们，我们将尽快处理。
          </p>
        </section>
      </div>
    </div>
  );
}
