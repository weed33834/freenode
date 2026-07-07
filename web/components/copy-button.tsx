"use client";

import { useCallback, useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "复制", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = useCallback(async () => {
    setError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: use a temporary textarea for older browsers / insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
      document.body.removeChild(textarea);
    }
  }, [text]);

  const state = error ? "error" : copied ? "copied" : "idle";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={error ? "复制失败" : copied ? "已复制" : label}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium border transition-colors ${
        state === "copied"
          ? "border-success/30 text-success bg-success/10"
          : state === "error"
            ? "border-danger/30 text-danger bg-danger/10"
            : "border-primary text-primary hover:bg-primary hover:text-background"
      } ${className}`}
    >
      {state === "copied" ? (
        <Check className="w-3.5 h-3.5" />
      ) : state === "error" ? (
        <X className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {state === "copied" ? "已复制" : state === "error" ? "复制失败" : label}
    </button>
  );
}
