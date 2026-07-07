import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchNodeDetail, fetchNodeHistory } from "@/lib/api";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `节点 #${id} — FreeNode`,
  };
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN");
}

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nodeId = Number(id);
  if (!Number.isInteger(nodeId) || nodeId <= 0) notFound();

  const [node, history] = await Promise.all([
    fetchNodeDetail(nodeId),
    fetchNodeHistory(nodeId),
  ]);
  if (!node) notFound();

  // 服务器地址脱敏，避免直接暴露完整 IP / 域名。
  // 之前只处理了 IPv4 dotted-quad：IPv6 / 域名 / 主机名会原样输出，
  // 节点服务器信息会被搜索引擎 / 浏览器历史 / 用户截图直接泄露。
  function maskServer(raw: string): string {
    const s = (raw || "").trim();
    if (!s) return "—";
    // IPv4：1.2.3.4 → 1.2.xxx.xxx
    const v4 = s.split(".");
    if (v4.length === 4 && v4.every((p) => /^\d+$/.test(p))) {
      return `${v4[0]}.${v4[1]}.xxx.xxx`;
    }
    // IPv6：8 段冒号分隔，保留前 2 段 + ::xxxx:xxxx 占位
    const v6 = s.split(":");
    if (v6.length >= 3 && v6.length <= 8) {
      // 含 "::" 简写或纯十六进制段都按 IPv6 处理
      const looksV6 =
        s.includes("::") || v6.every((p) => p === "" || /^[0-9a-fA-F]{1,4}$/.test(p));
      if (looksV6) {
        return `${v6.slice(0, 2).join(":")}::xxxx:xxxx`;
      }
    }
    // 域名 / 主机名：保留 TLD，主机名替换为 xxx
    // 例：node1.example.com → xxx.example.com；foo.bar.baz → xxx.bar.baz
    const dotIdx = s.indexOf(".");
    if (dotIdx > 0 && dotIdx < s.length - 1) {
      const suffix = s.slice(dotIdx + 1);
      return `xxx.${suffix}`;
    }
    // 兜底：单段主机名，整体脱敏
    return "xxx";
  }

  const maskedServer = maskServer(node.server);

  const info: Array<{ label: string; value: string }> = [
    { label: "协议", value: node.protocol.toUpperCase() },
    { label: "服务器", value: maskedServer },
    { label: "端口", value: String(node.port) },
    { label: "网络", value: node.network || "—" },
    { label: "TLS", value: node.tls ? "开启" : "关闭" },
    { label: "地区", value: node.region || "—" },
    { label: "来源", value: node.source_name || "—" },
    { label: "状态", value: node.is_alive ? "可用" : "失效" },
    {
      label: "延迟",
      value:
        node.last_latency_ms != null ? `${node.last_latency_ms} ms` : "—",
    },
    { label: "首次收录", value: formatTime(node.first_seen_at) },
    { label: "最后检查", value: formatTime(node.last_checked_at) },
    { label: "失败原因", value: node.fail_reason ?? "—" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link
        href="/nodes"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mb-6"
      >
        ← 返回节点列表
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted uppercase">
          {node.protocol}
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold">
          {node.remark || `节点 #${node.id}`}
        </h1>
      </div>

      <div className="border border-border bg-surface p-5 mb-8">
        <h2 className="font-medium text-sm mb-4">基本信息</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          {info.map((item) => (
            <div key={item.label} className="flex items-baseline gap-3">
              <dt className="w-20 shrink-0 text-muted">{item.label}</dt>
              <dd
                className={`font-mono break-all ${
                  item.label === "状态"
                    ? node.is_alive
                      ? "text-success"
                      : "text-muted"
                    : "text-foreground"
                }`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border border-border bg-surface p-5">
        <h2 className="font-medium text-sm mb-4">检查历史</h2>
        {history.length === 0 ? (
          <p className="text-xs text-muted">暂无检查记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-muted border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-medium">检查时间</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">延迟</th>
                  <th className="px-3 py-2 font-medium">失败原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((c) => (
                  <tr
                    key={
                      c.checked_at ??
                      `${c.is_alive}-${c.latency_ms ?? "n"}-${c.fail_reason ?? "n"}`
                    }
                  >
                    <td className="px-3 py-2 font-mono text-muted">
                      {formatTime(c.checked_at)}
                    </td>
                    <td className="px-3 py-2">
                      {c.is_alive ? (
                        <span className="text-success font-medium">可用</span>
                      ) : (
                        <span className="text-muted font-medium">失效</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted">
                      {c.latency_ms != null ? `${c.latency_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {c.fail_reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
