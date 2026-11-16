import { ArrowUpRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";

const YEAR = 2026;

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "Your matches" },
      { href: "/catalogue", label: "Perfume catalogue" },
      { href: "/onboarding", label: "Build a profile" },
      { href: "/profile", label: "Saved profile" },
    ],
  },
  {
    title: "Understand",
    links: [
      { href: "/about", label: "How the model works" },
      { href: "/about#clusters", label: "Scent clusters" },
      { href: "/about#data", label: "Data & ethics" },
      { href: "/about#limitations", label: "Limitations" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-ivory">
      <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-amber/10 blur-3xl" />
      <div className="container-page relative py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
          <div>
            <Logo tone="ivory" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/55">
              A scent-intelligence project that turns notes, families and your own taste into
              recommendations you can understand.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/hashiransari3000/Scent-IQ"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-ivory/20 px-4 py-2 text-xs text-ivory/70 transition hover:border-ivory/40 hover:text-ivory"
              >
                <GitBranch className="size-3.5" />
                Source
                <ArrowUpRight className="size-3" />
              </a>
              <Link
                href="/about"
                className="rounded-full border border-ivory/20 px-4 py-2 text-xs text-ivory/70 transition hover:border-ivory/40 hover:text-ivory"
              >
                Model card
              </Link>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="eyebrow text-amber-light/80">{column.title}</p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ivory/55 transition hover:text-ivory"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="eyebrow text-amber-light/80">Data note</p>
            <p className="mt-5 text-xs leading-relaxed text-ivory/45">
              Perfume data from the Scento Perfume Database, licensed CC BY 4.0. Price tiers are
              estimates based on house positioning, never retail prices. Visuals are generated from
              scent families, not brand photography.
            </p>
            <p className="mt-4 text-xs text-ivory/35">
              ScentIQ is an independent project and is not affiliated with any fragrance house.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-ivory/10 pt-6 text-[0.68rem] uppercase tracking-[0.16em] text-ivory/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} ScentIQ · Built as a portfolio project</p>
          <p>Made with Next.js, FastAPI &amp; scikit-learn</p>
        </div>
      </div>
    </footer>
  );
}
