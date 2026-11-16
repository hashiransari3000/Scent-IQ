"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, Sparkles, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/about", label: "The method" },
  { href: "/profile", label: "Your profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink/10 glass">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  className={cn(
                    "underline-sweep text-[0.82rem] font-medium tracking-[0.01em] transition-colors",
                    active ? "text-ink" : "text-ink/60 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label="Your profile"
              className="hidden size-10 place-items-center rounded-full text-ink/65 transition hover:bg-ink/5 hover:text-ink md:grid"
            >
              <UserRound className="size-[18px]" strokeWidth={1.6} />
            </Link>
            <Link
              href="/onboarding"
              className="group hidden items-center gap-2 rounded-full bg-ink px-5 py-3 text-[0.78rem] font-medium tracking-wide text-ivory transition hover:bg-ink-soft sm:inline-flex"
            >
              <Sparkles className="size-3.5 text-amber-light" strokeWidth={1.8} />
              Find my scent
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="grid size-11 place-items-center rounded-full border border-ink/15 text-ink md:hidden"
            >
              <Menu className="size-5" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] bg-ink text-ivory md:hidden"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-page flex min-h-dvh flex-col">
              <div className="flex h-[72px] items-center justify-between">
                <Logo tone="ivory" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-11 place-items-center rounded-full border border-ivory/20"
                >
                  <X className="size-5" strokeWidth={1.6} />
                </button>
              </div>

              <nav className="mt-12 flex flex-col" aria-label="Mobile">
                {NAV.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center justify-between border-b border-ivory/12 py-5"
                    >
                      <span className="font-display text-4xl tracking-[-0.03em]">{item.label}</span>
                      <ArrowUpRight className="size-5 text-amber-light" strokeWidth={1.3} />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto pb-10 pt-12">
                <Link
                  href="/onboarding"
                  className="flex items-center justify-center gap-2 rounded-full bg-amber px-6 py-4 text-sm font-semibold text-ink"
                >
                  <Sparkles className="size-4" />
                  Build my scent profile
                </Link>
                <p className="mt-5 text-center text-[0.65rem] uppercase tracking-[0.18em] text-ivory/40">
                  1,478 perfumes · 160 houses · 14 families
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
