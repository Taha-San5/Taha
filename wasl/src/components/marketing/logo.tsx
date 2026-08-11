import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The mark is one node branching into two — the product's signature behaviour
 * (a value arriving, then fanning out down separate paths) rather than a
 * decorative glyph. It reads at 16px because it is three dots and two curves,
 * with no enclosing box to collapse into mush at small sizes.
 */
export function LogoMark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
      style={{ direction: "ltr" }}
    >
      <defs>
        <linearGradient id="wasl-mark-grad" x1="5" y1="16" x2="27" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" />
          <stop offset="0.55" stopColor="#818cf8" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* the two branches */}
      <path
        d="M7.5 16C13 16 14.5 8.5 24 8.5"
        stroke="url(#wasl-mark-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M7.5 16C13 16 14.5 23.5 24 23.5"
        stroke="url(#wasl-mark-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* input node, slightly larger to read as the origin */}
      <circle cx="6.4" cy="16" r="3.5" fill="url(#wasl-mark-grad)" />
      {/* the two outputs */}
      <circle cx="25.2" cy="8.5" r="2.9" fill="url(#wasl-mark-grad)" />
      <circle cx="25.2" cy="23.5" r="2.9" fill="url(#wasl-mark-grad)" opacity="0.62" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="transition-transform duration-200 group-hover:scale-105" />
      {showWordmark ? (
        <span className="text-[16px] font-semibold tracking-[-0.01em] text-ink-100">Wasl</span>
      ) : null}
    </Link>
  );
}
