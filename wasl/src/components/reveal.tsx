"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Fades a section in the first time it scrolls into view.
 *
 * Starts visible and only hides once the observer is attached, so the content is
 * always present for crawlers and for anyone with JavaScript disabled. The
 * global prefers-reduced-motion rule collapses the transition to nothing.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"initial" | "hidden" | "shown">("initial");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Already on screen on first paint? Show it without animating.
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setState("shown");
      return;
    }

    setState("hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("shown");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        state === "hidden" ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100",
        className,
      )}
      style={{ transitionDelay: state === "shown" ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
