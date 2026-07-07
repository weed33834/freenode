import { ExternalLink, LucideIcon, Star } from "lucide-react";

interface ClientCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  platforms: string[];
  href: string;
  tags?: string[];
  importInstructions?: string;
  difficulty?: "新手" | "进阶" | "高阶";
  scenario?: string;
  rating?: number;
}

const difficultyStyles: Record<"新手" | "进阶" | "高阶", string> = {
  新手: "text-success border-success/30 bg-success/10",
  进阶: "text-warning border-warning/30 bg-warning/10",
  高阶: "text-danger border-danger/30 bg-danger/10",
};

export function ClientCard({
  name,
  description,
  icon: Icon,
  platforms,
  href,
  tags = [],
  importInstructions,
  difficulty = "新手",
  scenario = "",
  rating = 0,
}: ClientCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 border border-border text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                {name}
              </h3>
              <span
                className={`text-[10px] px-1.5 py-0.5 border ${difficultyStyles[difficulty]}`}
              >
                {difficulty}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Star
                    key={level}
                    className={`w-3 h-3 ${
                      level <= rating
                        ? "text-primary fill-primary"
                        : "text-muted/30"
                    }`}
                  />
                ))}
              </div>
              {scenario && (
                <span className="text-[10px] text-muted">· {scenario}</span>
              )}
            </div>
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
      </div>
      <p className="text-[10px] text-muted mb-1.5">{platforms.join(" · ")}</p>
      <p className="text-xs text-muted mb-2 line-clamp-2">{description}</p>
      {importInstructions && (
        <p className="text-[10px] text-muted leading-relaxed mb-2 border-l-2 border-primary/30 pl-2">
          {importInstructions}
        </p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 border border-border text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
