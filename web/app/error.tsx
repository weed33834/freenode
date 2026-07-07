"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 border border-warning/20 bg-warning/10 text-warning mb-6">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-semibold mb-2">出错了</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          页面加载时发生错误。可以尝试重试，若问题持续请稍后再试。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          重试
        </button>
      </div>
    </div>
  );
}
