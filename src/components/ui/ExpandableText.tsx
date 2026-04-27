"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  maxChars?: number;
  className?: string;
  buttonClassName?: string;
  expandLabel?: string;
  collapseLabel?: string;
}

export function ExpandableText({
  text,
  maxChars = 260,
  className,
  buttonClassName,
  expandLabel = "Read more",
  collapseLabel = "Show less",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const normalizedText = useMemo(() => text.replace(/\s+/g, " ").trim(), [text]);
  const isTruncated = normalizedText.length > maxChars;

  const displayText = expanded || !isTruncated
    ? normalizedText
    : `${normalizedText.slice(0, maxChars).trimEnd()}…`;

  return (
    <div>
      <p className={className}>{displayText}</p>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors",
            buttonClassName
          )}
          aria-expanded={expanded}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
}
