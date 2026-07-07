interface ProtocolChartProps {
  counts: Record<string, number>;
}

const protocolColors: Record<string, string> = {
  vless: "#f5a623",
  vmess: "#22b8d0",
  trojan: "#f97316",
  ss: "#3ad76b",
  ssr: "#06b6d4",
  http: "#8b8b9e",
  https: "#b8b8c8",
  socks4: "#6b6b7a",
  socks5: "#52525b",
};

export function ProtocolChart({ counts }: ProtocolChartProps) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total === 0) {
    return (
      <div className="border border-border bg-surface p-5 text-center text-muted text-sm">
        暂无节点数据
      </div>
    );
  }

  let cumulative = 0;

  return (
    <div className="border border-border bg-surface p-5">
      <h3 className="font-medium text-sm mb-5">协议分布</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
            {entries.map(([protocol, count]) => {
              const dash = (count / total) * 100;
              const offset = cumulative;
              cumulative += dash;
              return (
                <circle
                  key={protocol}
                  r="15.9"
                  cx="16"
                  cy="16"
                  fill="transparent"
                  stroke={protocolColors[protocol.toLowerCase()] || "#71717a"}
                  strokeWidth="4"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-semibold font-mono">{total}</span>
            <span className="text-[10px] text-muted">节点</span>
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="space-y-2">
            {entries.map(([protocol, count]) => (
              <div key={protocol} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 shrink-0"
                  style={{ backgroundColor: protocolColors[protocol.toLowerCase()] || "#71717a" }}
                />
                <span className="flex-1 font-mono uppercase">{protocol}</span>
                <span className="font-medium font-mono mr-1">{count}</span>
                <span className="text-muted w-10 text-right">
                  {((count / total) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
