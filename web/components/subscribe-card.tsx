import { CopyButton } from "./copy-button";

interface SubscribeCardProps {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
}

export function SubscribeCard({
  title,
  description,
  url,
  icon,
}: SubscribeCardProps) {
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
