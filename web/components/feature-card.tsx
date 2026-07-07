import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon: Icon, title, description, className = "" }: FeatureCardProps) {
  return (
    <div className={`border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 border border-border text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          <p className="text-muted text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
