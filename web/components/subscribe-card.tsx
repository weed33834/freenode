"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";

interface SubscribeCardProps {
  title: string;
  description: string;
  githubUrl: string;
  gitcodeUrl: string;
  icon: React.ReactNode;
}

export function SubscribeCard({
  title,
  description,
  githubUrl,
  gitcodeUrl,
  icon,
}: SubscribeCardProps) {
  const [mirror, setMirror] = useState<"github" | "gitcode">("github");
  const url = mirror === "github" ? githubUrl : gitcodeUrl;

  return (
    <div className="border border-border bg-surface p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 border border-border bg-background text-foreground">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-base">{title}</h3>
          <p className="text-muted text-xs leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex border border-border p-0.5">
          <button
            type="button"
            aria-pressed={mirror === "github"}
            onClick={() => setMirror("github")}
            className={`flex-1 py-1 text-xs font-medium transition-colors ${
              mirror === "github"
                ? "bg-surface-hover text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            GitHub
          </button>
          <button
            type="button"
            aria-pressed={mirror === "gitcode"}
            onClick={() => setMirror("gitcode")}
            className={`flex-1 py-1 text-xs font-medium transition-colors ${
              mirror === "gitcode"
                ? "bg-surface-hover text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            GitCode
          </button>
        </div>

        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={url}
            aria-label="订阅链接"
            className="flex-1 min-w-0 bg-background border border-border px-3 py-2 text-xs font-mono text-foreground truncate focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <CopyButton text={url} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
