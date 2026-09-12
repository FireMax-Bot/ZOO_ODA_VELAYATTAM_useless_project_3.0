import type { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

/** Shared Apple-glass surface: translucent, blurred, soft border + shadow. */
export function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-white/20 bg-white/[0.14] shadow-2xl shadow-black/40 backdrop-blur-[220px] ${className}`}
    >
      {children}
    </div>
  );
}
