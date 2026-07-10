import type { ComponentType } from "react";

type IconType = ComponentType<{ className?: string }>;

export interface StatCardItem {
  /** 大号数字/字符串 */
  value: string | number;
  /** 小标签 */
  label: string;
  /** 左上角图标 */
  icon?: IconType;
  /** 图标颜色类，默认 text-muted */
  iconClassName?: string;
  /** 底部说明小字 */
  hint?: string;
}

/**
 * 单个统计卡片：图标 + 大数字 + 标签 + 可选 hint。
 * 统一各页面的统计块样式。
 */
export function StatCard({ value, label, icon: Icon, iconClassName, hint }: StatCardItem) {
  return (
    <div className="border border-border bg-surface p-4">
      {Icon && <Icon className={`w-4 h-4 mb-2 ${iconClassName ?? "text-muted"}`} />}
      <div className="text-xl font-semibold font-mono">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
      {hint && <div className="mt-2 text-[10px] text-muted leading-relaxed">{hint}</div>}
    </div>
  );
}

/**
 * 统计卡片网格。cols 控制列数（默认 4）。
 */
export function StatGrid({
  items,
  cols = 4,
}: {
  items: StatCardItem[];
  cols?: 2 | 3 | 4;
}) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  }[cols];
  return (
    <div className={`grid ${colsClass} gap-3`}>
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}
