"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-amber-dark">A wrinkle</p>
      <h1 className="mt-3 max-w-xl font-display text-[clamp(2.4rem,5.5vw,4rem)] leading-[0.98]">
        Something did not render.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/50">
        This is usually a temporary hiccup. Your profile is safe in this browser — retry the page,
        or head back to the catalogue.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.8rem] font-semibold text-ivory transition hover:bg-ink-soft"
        >
          <RotateCcw className="size-3.5" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3.5 text-[0.8rem] font-medium text-ink/60 transition hover:border-ink/35"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
