"use client";

// PROTOTYPE-ONLY component — the floating variant switcher described in
// .claude/skills/prototype/UI.md. Gated out of production builds below.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface VariantMeta {
  key: string;
  name: string;
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: VariantMeta[];
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProduction = process.env.NODE_ENV === "production";

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  function go(next: number) {
    const wrapped = (next + variants.length) % variants.length;
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", variants[wrapped].key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (isProduction) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isProduction]);

  if (isProduction) return null;

  const meta = variants[index];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-900 px-1.5 py-1.5 text-white shadow-2xl">
      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Variante anterior"
        className="rounded-full p-1.5 hover:bg-white/10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-xs font-semibold tracking-wide">
        {meta.key} — {meta.name}
      </span>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Variante siguiente"
        className="rounded-full p-1.5 hover:bg-white/10"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
