import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  offset: number;
  pageSize: number;
  onOffsetChange: (offset: number) => void;
}

export function Pagination({ total, offset, pageSize, onOffsetChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  return (
    <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
      <span className="text-xs text-muted font-mono">
        第 {currentPage} / {pageCount} 页
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> 上一页
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(offset + pageSize)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          下一页 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
