"use client";

import { useState } from "react";

interface RegionCloudProps {
  regions: Record<string, number>;
}

export function RegionCloud({ regions }: RegionCloudProps) {
  const [active, setActive] = useState<string | null>(null);

  const entries = Object.entries(regions)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted">
        地区数据暂未生成，可在本地启用 FREENODE_GEO_ENABLED=true 生成
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([region, count]) => {
        const isActive = active === region;
        return (
          <button
            key={region}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActive(isActive ? null : region)}
            className={`font-mono text-xs px-2 py-1 border transition-colors ${
              isActive
                ? "border-primary bg-primary text-background"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            <span>{region}</span>
            <span className="ml-1.5 opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
