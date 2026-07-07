"use client";

import { useState, useMemo } from "react";
import {
  Newspaper,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  news,
  categoryLabels,
  categoryStyles,
  type NewsCategory,
} from "@/lib/news";

const filters: (NewsCategory | "all")[] = ["all", "project", "protocol", "security"];

export default function NewsPage() {
  const [activeFilter, setActiveFilter] = useState<NewsCategory | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const filteredNews = useMemo(() => {
    if (activeFilter === "all") return news;
    return news.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono mb-3">
          <Newspaper className="w-3.5 h-3.5" />
          NEWS
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">动态</h1>
        <p className="text-sm text-muted max-w-2xl">
          FreeNode 的项目进展、协议科普与安全建议，帮助你更好地使用公开代理资源。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((key) => {
          const active = activeFilter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                active
                  ? "bg-primary text-background border-primary"
                  : "border-border text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {categoryLabels[key]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNews.map((item) => {
          const isExpanded = expanded.has(item.id);
          return (
            <article
              key={item.id}
              className="border border-border bg-surface p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-base leading-snug">{item.title}</h2>
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 border ${categoryStyles[item.category]}`}
                >
                  {categoryLabels[item.category]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {categoryLabels[item.category]}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.summary}</p>
              {isExpanded && (
                <div className="text-xs text-foreground leading-relaxed border-t border-border pt-3">
                  {item.content}
                </div>
              )}
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                className="mt-auto inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                {isExpanded ? (
                  <>
                    收起 <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    展开详情 <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center text-sm text-muted py-12">
          该分类下暂无动态
        </div>
      )}
    </div>
  );
}
