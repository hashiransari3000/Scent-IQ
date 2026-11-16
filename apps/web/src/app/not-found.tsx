import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FamilyArt } from "@/components/family-art";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-8 size-32 overflow-hidden rounded-full border border-ink/10">
        <FamilyArt slug="oud_court" seed="404" className="absolute inset-0" label={false} />
        <span className="absolute inset-0 grid place-items-center bg-ink/35 font-display text-[2.4rem] text-ivory backdrop-blur-[2px]">
          404
        </span>
      </div>
      <p className="eyebrow text-amber-dark">Off the map</p>
      <h1 className="mt-3 max-w-lg font-display text-[clamp(2.6rem,6vw,4.4rem)] leading-[0.98]">
        This one is not in the catalogue.
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/50">
        The page or perfume you asked for does not exist — or it was mistyped. The 1,478 that do
        exist are one tap away.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.8rem] font-semibold text-ivory transition hover:bg-ink-soft"
        >
          Browse the catalogue <ArrowRight className="size-3.5" />
        </Link>
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
