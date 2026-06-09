"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  /** Glanceable summary shown only when the section is collapsed. */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  summary,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 text-left mb-4"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold">{title}</h2>
          {open && subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {!open && summary && (
          <div className="shrink-0 text-sm text-muted-foreground">{summary}</div>
        )}
      </button>

      <div id={contentId} hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}
