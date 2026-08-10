import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The mark is two nodes joined by a link — the literal meaning of "wasl"
 * (connection) and the core gesture of the product.
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
        <linearGradient id="wasl-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#12151f" stroke="#262c3d" />
      <path d="M9.5 11.5h4a5 5 0 0 1 5 5 5 5 0 0 0 5 5h0" stroke="url(#wasl-mark)" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="9.5" cy="11.5" r="2.6" fill="url(#wasl-mark)" />
      <circle cx="23" cy="21.5" r="2.6" fill="url(#wasl-mark)" />
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
        <span className="text-[15px] font-semibold tracking-tight text-ink-100">
          Wasl<span className="text-ink-500"> / </span>
          <span className="font-arabic">وصل</span>
        </span>
      ) : null}
    </Link>
  );
}
