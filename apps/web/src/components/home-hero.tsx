"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Perfume } from "@/lib/types";
import { FamilyArt } from "./family-art";

const NOTES = ["Saffron", "Jasmine", "Amberwood", "Fir resin", "Cedar"];

export function HomeHero({
  featured,
  stats,
}: {
  featured: Perfume;
  stats: { perfumes: number; houses: number; notes: number; clusters: number; families: number };
}) {
  const reduce = useReducedMotion();
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <section className="grain relative overflow-hidden bg-ink text-ivory">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_18%,rgba(200,150,62,0.2),transparent_46%),radial-gradient(ellipse_at_12%_85%,rgba(184,107,119,0.12),transparent_42%)]" />
      <div className="orb left-[8%] top-[22%] size-[26rem] bg-amber/12" />
      <div className="orb bottom-[4%] right-[6%] size-[22rem] bg-rose/10 [animation-delay:-7s]" />

      <div className="container-page relative grid min-h-[calc(100svh-72px)] items-center gap-14 py-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-8 lg:py-20">
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10">
          <motion.div variants={item} className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-amber" />
            <p className="eyebrow text-ivory/50">Scent intelligence · independent project</p>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 max-w-[13ch] font-display text-[clamp(3.25rem,7.4vw,7rem)] leading-[0.92] tracking-[-0.045em]"
          >
            Wear what
            <br />
            you <span className="italic text-amber-light">already</span> are.
          </motion.h1>

          <motion.p variants={item} className="mt-7 max-w-md text-[0.95rem] leading-relaxed text-ivory/58">
            ScentIQ reads the notes, families and character of {stats.perfumes.toLocaleString()}{" "}
            perfumes, then learns from the ones you love. Every match arrives with a reason.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-amber px-6 py-4 text-sm font-semibold text-ink transition hover:bg-amber-light"
            >
              <Sparkles className="size-4" strokeWidth={1.8} />
              Build my scent profile
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ivory/20 px-6 py-4 text-sm text-ivory/80 transition hover:border-ivory/45 hover:text-ivory"
            >
              Browse the catalogue
            </Link>
          </motion.div>

          <motion.p variants={item} className="mt-7 text-[0.62rem] uppercase tracking-[0.17em] text-ivory/32">
            No account needed · 90-second profile · {stats.houses} houses · {stats.clusters} scent clusters
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 34, rotate: reduce ? 0 : 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 1.05, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-[430px] lg:mx-0 lg:ml-auto"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-ivory/15 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
            <FamilyArt
              slug={featured.familySlug}
              name={featured.family}
              seed={featured.id}
              className="aspect-[4/5]"
              overlay={false}
              label={false}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,7,6,0.92)_0%,rgba(8,7,6,0.12)_58%,transparent_100%)]" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
              <span className="rounded-full border border-ivory/20 bg-ink/20 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-ivory/70 backdrop-blur-md">
                Featured composition
              </span>
              <span className="text-[0.58rem] uppercase tracking-[0.18em] text-ivory/45">
                01 / {stats.families}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[0.58rem] uppercase tracking-[0.2em] text-amber-light/80">
                {featured.family} · {featured.concentration}
              </p>
              <h2 className="mt-2 font-display text-[2.35rem] leading-[0.98] tracking-[-0.03em]">
                {featured.name}
              </h2>
              <p className="mt-1.5 text-sm text-ivory/60">{featured.house}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {featured.notes.slice(0, 4).map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-ivory/18 bg-ivory/8 px-2.5 py-1 text-[0.6rem] text-ivory/72 backdrop-blur-sm"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -left-5 top-[36%] hidden rounded-2xl border border-ivory/15 bg-ink/75 p-3.5 backdrop-blur-xl sm:block">
            <p className="text-[0.5rem] uppercase tracking-[0.18em] text-ivory/40">Note profile</p>
            <div className="mt-2 flex items-end gap-1">
              {[42, 64, 88, 56, 74, 38].map((height, index) => (
                <span
                  key={index}
                  className="w-1.5 rounded-full bg-amber/70"
                  style={{ height: `${height * 0.42}px`, opacity: 0.45 + index * 0.09 }}
                />
              ))}
            </div>
          </div>

          <div className="absolute -right-5 top-[24%] hidden rounded-2xl border border-ivory/15 bg-ink/75 px-4 py-3 backdrop-blur-xl sm:block">
            <p className="text-[0.5rem] uppercase tracking-[0.18em] text-ivory/40">Signature</p>
            <p className="mt-1 font-display text-lg text-ivory/90">Amber · Saffron</p>
          </div>
        </motion.div>
      </div>

      <div className="relative border-t border-ivory/10 py-4">
        <div className="ticker-mask overflow-hidden">
          <div className="marquee-track gap-8 pr-8">
            {[...NOTES, ...NOTES, ...NOTES, ...NOTES].map((note, index) => (
              <span
                key={`${note}-${index}`}
                className="flex items-center gap-8 whitespace-nowrap text-[0.6rem] uppercase tracking-[0.24em] text-ivory/35"
              >
                {note}
                <span className="size-1 rounded-full bg-amber/60" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        href="#how"
        className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/35 transition hover:text-ivory/70 lg:flex"
        aria-label="Scroll to how it works"
      >
        <span className="text-[0.55rem] uppercase tracking-[0.2em]">Explore</span>
        <ArrowDown className="size-4 animate-bounce" />
      </a>
    </section>
  );
}
