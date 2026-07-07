import { Clock, Database, Globe, Server } from "lucide-react";

interface StatsSectionProps {
  generatedAt: string;
  totalNodes: number;
  enabledSources: number;
  totalSources: number;
  protocolCount?: number;
}

export function StatsSection({
  generatedAt,
  totalNodes,
  enabledSources,
  totalSources,
  protocolCount,
}: StatsSectionProps) {
  const items = [
    { label: "节点总数", value: totalNodes, icon: Server },
    { label: "启用数据源", value: `${enabledSources}/${totalSources}`, icon: Database },
    { label: "覆盖协议", value: protocolCount ?? 0, icon: Globe },
    { label: "最近更新", value: generatedAt, icon: Clock },
  ];

  return (
    <section className="border-y border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {items.map((item) => (
            <div
              key={item.label}
              className="px-4 py-5 flex items-center gap-3 animate-slide-up"
            >
              <item.icon className="w-4 h-4 text-muted" />
              <div>
                <div className="text-xl md:text-2xl font-semibold font-mono tracking-tight">
                  {item.value}
                </div>
                <div className="text-xs text-muted">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
