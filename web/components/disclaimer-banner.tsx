"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-warning/20 bg-warning/10 text-warning">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>安全提示：</strong>
            本项目所有节点来自公开渠道，仅供学习研究。不保证可用性、安全性与隐私性。
            <Link href="/disclaimer" className="underline ml-1 hover:text-foreground">
              查看完整免责声明
            </Link>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:bg-warning/20"
          aria-label="关闭提示"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
