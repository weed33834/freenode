import type { ReactNode } from "react";

type Tone = "success" | "muted" | "warning" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  success: "text-success border-success/20",
  muted: "text-muted border-border",
  warning: "text-warning border-warning/20",
  danger: "text-danger border-danger/20",
};

/**
 * 小型状态徽章：带颜色边框的小标签。
 * 统一各表格/卡片里的"可用/失效/启用/禁用"等状态展示。
 */
export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 border ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
