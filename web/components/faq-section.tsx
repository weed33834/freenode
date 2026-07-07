"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
}

export function FaqSection({ items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="border border-border divide-y divide-border bg-surface">
      {items.map((item, index) => {
        const open = openIndex === index;
        const answerId = `faq-answer-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.question}>
            <button
              type="button"
              id={buttonId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover/50 transition-colors"
              aria-expanded={open}
              aria-controls={answerId}
            >
              <span className="font-medium text-sm">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted shrink-0 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open && (
              <div
                id={answerId}
                role="region"
                aria-labelledby={buttonId}
                className="px-4 pb-3 text-xs text-muted leading-relaxed animate-fade-in"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
