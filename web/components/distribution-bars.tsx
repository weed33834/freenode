/**
 * 通用"label + 进度条 + count"分布条。
 * dashboard/status/sources 三页共用，替代手写内联结构。
 */
export function DistributionBars({
  items,
  total,
  emptyText,
  labelWidth = "w-24",
  countWidth = "w-12",
}: {
  items: { label: string; count: number }[];
  total: number;
  emptyText: string;
  labelWidth?: string;
  countWidth?: string;
}) {
  if (items.length === 0 || total === 0) {
    return <p className="text-xs text-muted">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-xs">
          <span
            className={`${labelWidth} shrink-0 font-mono uppercase truncate`}
            title={item.label}
          >
            {item.label}
          </span>
          <div className="flex-1 h-2 bg-background border border-border overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          </div>
          <span className={`${countWidth} text-right font-mono`}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}
