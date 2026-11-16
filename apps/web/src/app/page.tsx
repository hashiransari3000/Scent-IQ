import {
  ArrowUpRight,
  Braces,
  Compass,
  GitBranch,
  Layers3,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { FamilyArt } from "@/components/family-art";
import { HomeHero } from "@/components/home-hero";
import { PerfumeCard } from "@/components/perfume-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { getCatalogue, getFeatured, getPerfume, getStats } from "@/lib/catalogue";
import { seasonLabel } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    title: "Tell us what you love",
    body: "Pick a few families, notes and perfumes you already wear. No account, no long quiz — about ninety seconds.",
    icon: Compass,
  },
  {
    number: "02",
    title: "We map the scent space",
    body: "Every perfume becomes a vector of note families. K-Means groups the catalogue into readable scent clusters.",
    icon: Layers3,
  },
  {
    number: "03",
    title: "Get matches, with reasons",
    body: "A decision tree learns what you tend to enjoy, then a hybrid ranker brings back the strongest, most diverse matches.",
    icon: Target,
  },
];

export default function HomePage() {
  const catalogue = getCatalogue();
  const stats = getStats();
  const featured = getPerfume("mfk-baccarat-rouge-540") ?? getFeatured(1)[0];
  const picks = getFeatured(8);

  return (
    <>
      <HomeHero featured={featured} stats={stats} />

      <section className="border-b border-ink/10 bg-ivory-soft">
        <div className="container-page grid grid-cols-2 divide-x divide-y divide-ink/10 md:grid-cols-4 md:divide-y-0">
          {[
            { value: stats.perfumes.toLocaleString(), label: "Perfumes mapped" },
            { value: stats.houses, label: "Houses" },
            { value: stats.families, label: "Scent families" },
            { value: stats.clusters, label: "Learned clusters" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-8 sm:px-8 md:py-10">
              <p className="font-display text-[2.1rem] leading-none tracking-[-0.03em]">
                {stat.value}
              </p>
              <p className="mt-2 text-[0.62rem] uppercase tracking-[0.17em] text-ink/45">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="container-page py-24 lg:py-32">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                A profile, not a <span className="italic text-amber-dark">personality quiz.</span>
              </>
            }
            description="ScentIQ stays close to the actual composition of a perfume: its notes, families and structure. Your taste is the only thing we ask you to bring."
            action={{ href: "/about", label: "Read the method" }}
          />
        </Reveal>

        <div className="mt-14 grid overflow-hidden rounded-[2rem] border border-ink/10 bg-ink/10 md:grid-cols-3 md:gap-px">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={index * 0.08} className="bg-ivory-soft">
                <div className="flex h-full flex-col p-7 lg:p-9">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-full border border-ink/12 text-ink/70">
                      <Icon className="size-[19px]" strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-[1.7rem] text-ink/18">{step.number}</span>
                  </div>
                  <h3 className="mt-8 font-display text-[1.65rem] leading-[1.05]">{step.title}</h3>
                  <p className="mt-3 text-[0.82rem] leading-relaxed text-ink/55">{step.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-ivory-deep/35 py-24 lg:py-28">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="Start with a feeling"
              title={
                <>
                  Fourteen families.
                  <br />
                  <span className="italic text-ink/55">One that feels like home.</span>
                </>
              }
              description="Every family is a different texture: dry woods, powdered iris, sunlit citrus, dark oud. Pick the ones that pull you in — or let the quiz help you find them."
              action={{ href: "/catalogue", label: "Explore the catalogue" }}
            />
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {catalogue.families.map((family, index) => (
              <Reveal key={family.slug} delay={Math.min(index * 0.03, 0.2)}>
                <Link
                  href={`/catalogue?family=${family.slug}`}
                  className="group relative block overflow-hidden rounded-[1.35rem] border border-ink/10"
                >
                  <FamilyArt
                    slug={family.slug}
                    name={family.name}
                    seed={family.slug}
                    className="aspect-[4/3] transition-transform duration-700 group-hover:scale-[1.04]"
                    label={false}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-[1.05rem] leading-tight text-ivory">
                      {family.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[0.56rem] uppercase tracking-[0.1em] text-ivory/55">
                      {family.description.split(":")[0]}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-24 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="From the catalogue"
            title="A few to begin with"
            description="Recognisable compositions across the scent map. Every card opens into the full pyramid, the learned cluster and similar perfumes."
            action={{ href: "/catalogue", label: "All 1,478 perfumes" }}
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {picks.map((perfume, index) => (
            <Reveal key={perfume.id} delay={Math.min(index * 0.04, 0.2)}>
              <PerfumeCard perfume={perfume} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-24 text-ivory lg:py-32">
        <div className="pointer-events-none absolute -left-20 top-10 size-[30rem] rounded-full bg-amber/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-rose/10 blur-3xl" />
        <div className="container-page relative">
          <Reveal>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-amber-light/85">What K-Means found</p>
                <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.02]">
                  Six neighbourhoods
                  <br />
                  <span className="italic text-ivory/55">in the scent map.</span>
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-ivory/55">
                  The catalogue is clustered on note-family structure, not brand or price. These
                  are the groups the model discovered, named by their dominant family and notes.
                </p>
              </div>
              <Link
                href="/about#clusters"
                className="group inline-flex shrink-0 items-center gap-2 text-[0.75rem] uppercase tracking-[0.16em] text-ivory/60 transition hover:text-ivory"
              >
                How clustering works
                <span className="grid size-7 place-items-center rounded-full border border-ivory/20">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {catalogue.clusters.map((cluster, index) => (
              <Reveal key={cluster.id} delay={Math.min(index * 0.05, 0.3)}>
                <Link
                  href={`/catalogue?cluster=${cluster.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-ivory/12 bg-ivory/[0.035] p-6 transition hover:border-ivory/25 hover:bg-ivory/[0.06]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: cluster.color }}
                    />
                    <span className="text-[0.58rem] uppercase tracking-[0.18em] text-ivory/35">
                      {String(cluster.size).padStart(3, "0")} perfumes
                    </span>
                  </div>
                  <h3 className="mt-8 font-display text-[1.6rem] leading-[1.05]">
                    {cluster.name}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-[0.78rem] leading-relaxed text-ivory/48">
                    {cluster.description}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                    {cluster.topNotes.slice(0, 3).map((note) => (
                      <span
                        key={note}
                        className="rounded-full border border-ivory/12 px-2.5 py-1 text-[0.58rem] text-ivory/55"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-24 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <div>
              <p className="eyebrow text-amber-dark">Explainable by design</p>
              <h2 className="mt-3 font-display text-[clamp(2.2rem,4.2vw,3.7rem)] leading-[1.02]">
                Every match has a
                <br />
                <span className="italic text-ink/55">paper trail.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/58">
                No black box. Each recommendation separates content similarity, your predicted
                enjoyment, cluster affinity and catalogue quality — then tells you which notes
                connected.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Braces, label: "Content similarity", text: "Notes and families compared in a shared vector space." },
                  { icon: GitBranch, label: "Decision-tree prediction", text: "What similar users with your stated preferences tend to enjoy." },
                  { icon: Layers3, label: "Cluster affinity", text: "Whether it sits near perfumes already in your wardrobe." },
                  { icon: MessageSquareText, label: "Plain-language reasons", text: "Shared notes, seasons, budget fit and honest conflicts." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex gap-3.5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-ink/12 text-ink/55">
                        <Icon className="size-3.5" strokeWidth={1.6} />
                      </span>
                      <div>
                        <p className="text-[0.82rem] font-medium text-ink/85">{item.label}</p>
                        <p className="mt-0.5 text-[0.76rem] leading-relaxed text-ink/48">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-6 rounded-[2.6rem] bg-amber/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-ivory-soft p-5 shadow-[0_30px_80px_-40px_rgba(14,13,11,0.4)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[0.55rem] uppercase tracking-[0.18em] text-ink/40">
                      Example explanation
                    </p>
                    <h3 className="mt-2 font-display text-[1.7rem] leading-none">Oud Wood</h3>
                    <p className="mt-1 text-[0.72rem] text-ink/45">Tom Ford · Spice Route</p>
                  </div>
                  <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[0.58rem] font-medium uppercase tracking-[0.1em] text-amber-dark">
                    86 match
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { label: "Content similarity", value: 84 },
                    { label: "Predicted enjoyment", value: 78 },
                    { label: "Cluster affinity", value: 71 },
                    { label: "Catalogue quality", value: 64 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between text-[0.62rem] text-ink/50">
                        <span>{bar.label}</span>
                        <span>{bar.value}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/8">
                        <div
                          className="h-full rounded-full bg-amber"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl bg-ink px-4 py-4 text-ivory">
                  <p className="text-[0.55rem] uppercase tracking-[0.18em] text-amber-light/80">
                    Why this one
                  </p>
                  <ul className="mt-2.5 space-y-2 text-[0.72rem] leading-relaxed text-ivory/70">
                    <li>Shares oud, sandalwood and cardamom with perfumes you love.</li>
                    <li>Built for autumn and evening wear.</li>
                    <li>Sits in the Wood &amp; Root · Oud &amp; Patchouli cluster.</li>
                  </ul>
                </div>
                <p className="mt-3 text-center text-[0.55rem] uppercase tracking-[0.14em] text-ink/30">
                  Illustrative example · your weights will differ
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-24 lg:pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-amber px-7 py-12 text-ink sm:px-12 lg:px-16 lg:py-16">
            <div className="absolute -right-16 -top-20 size-[22rem] rounded-full border border-ink/10" />
            <div className="absolute -bottom-24 right-20 size-[16rem] rounded-full border border-ink/10" />
            <div className="relative max-w-2xl">
              <p className="eyebrow text-ink/55">Ready when you are</p>
              <h2 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.6rem)] leading-[0.98]">
                Find the one that
                <br />
                <span className="italic">already feels familiar.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/65">
                Build a profile in ninety seconds. Like and dislike matches as you go — the
                recommendation loop updates with you.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-semibold text-ivory transition hover:bg-ink-soft"
                >
                  <Sparkles className="size-4 text-amber-light" />
                  Build my scent profile
                </Link>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-4 text-sm font-medium text-ink/75 transition hover:border-ink/50"
                >
                  Browse first
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-ink/10 bg-ivory-soft">
        <div className="container-page flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-ink/38">
            {catalogue.source} · {catalogue.perfumes.length.toLocaleString()} compositions
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-ink/38">
            {seasonLabel("spring")} — {seasonLabel("winter")} · built for every season
          </p>
        </div>
      </section>
    </>
  );
}
