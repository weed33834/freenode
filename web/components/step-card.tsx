import { ReactNode } from "react";

interface StepCardProps {
  step: number;
  title: string;
  description: ReactNode;
  last?: boolean;
}

export function StepCard({ step, title, description, last = false }: StepCardProps) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 border border-primary text-primary text-xs font-medium flex items-center justify-center shrink-0">
          {step}
        </div>
        {!last && <div className="w-px flex-1 bg-border my-1" />}
      </div>
      <div className="pb-5">
        <h3 className="font-medium text-sm mb-0.5">{title}</h3>
        <div className="text-muted text-xs leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
