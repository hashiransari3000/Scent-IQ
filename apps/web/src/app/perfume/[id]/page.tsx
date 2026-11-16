import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, Layers3, Sparkles } from "lucide-react";
import { FamilyArt } from "@/components/family-art";
import { NotePyramid } from "@/components/note-pyramid";
import { PerfumeCard } from "@/components/perfume-card";
import { PersonalMatch } from "@/components/personal-match";
import { SectionHeading } from "@/components/section-heading";
import { getCatalogue, getCluster, getFamily, getPerfume, getSimilar } from "@/lib/catalogue";
import { formatYear, priceTierLabel, seasonLabel, timeLabel } from "@/lib/utils";

export function generateStaticParams() {
  return getCatalogue()
    .perfumes.filter((perfume) => (perfume.popularityRank ?? 9999) <= 160)
    .map((perfume) => ({ id: perfume.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const perfume = getPerfume(id);
  if (!perfume) {
    return { title: "Perfume not found" };
  }
  const description = `${perfume.name} by ${perfume.house}: ${perfume.description}`.slice(0, 180);
  return {
    title: `${perfume.name} — ${perfume.house}`,
    description,
    alternates: { canonical: `/perfume/${perfume.id}` },
    openGraph: {
      title: `${perfume.name} · ${perfume.house}`,
      description,
      type: "article",
      url: `/perfume/${perfume.id}`,
    },
    twitter: {
      card: "summary",
      title: `${perfume.name} · ${perfume.house}`,
      description,
    },
  };
}

export default function PerfumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <PerfumeDetail params={params} />
    </Suspense>
  );
}

async function PerfumeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfume = getPerfume(id);
  if (!perfume) notFound();

  const secondary = perfume.secondaryFamily ? getFamily(perfume.secondaryFamily) : undefined;
  const cluster = getCluster(perfume.clusterId);
  const similar = getSimilar(perfume, 4);
  const weights = Object.entries(perfume.familyWeights ?? {})
    .map(([slug, value]) => ({ family: getFamily(slug), value }))
    .filter((entry) => entry.family)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: perfume.name,
    brand: { "@type": "Brand", name: perfume.house },
    description: perfume.description,
    category: "Fragrance",
    url: `/perfume/${perfume.id}`,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Concentration", value: perfume.concentration },
      { "@type": "PropertyValue", name: "Scent family", value: perfume.family },
    ],
  };

  return (
    <article className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[0.62rem] uppercase tracking-[0.14em] text-ink/38">
          <Link href="/" className="transition hover:text-ink">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/catalogue" className="transition hover:text-ink">Catalogue</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink/60">{perfume.name}</span>
        </nav>
      </div>

      <section className="container-page pt-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-ink/10">
              <FamilyArt
                slug={perfume.familySlug ?? perfume.imageKey}
                name={perfume.family}
                seed={perfume.id}
                className="aspect-[4/5]"
                label={false}
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                <span className="rounded-full border border-ivory/25 bg-ink/25 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.16em] text-ivory/85 backdrop-blur-md">
                  {perfume.concentration}
                </span>
                {perfume.clusterColor && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ivory/20 bg-ink/25 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.1em] text-ivory/75 backdrop-blur-md">
                    <span className="size-1.5 rounded-full" style={{ background: perfume.clusterColor }} />
                    Cluster {String(perfume.clusterId).padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[0.58rem] uppercase tracking-[0.2em] text-ivory/50">
                  {perfume.family}
                  {secondary ? ` · ${secondary.name}` : ""}
                </p>
                <p className="mt-2 font-display text-[2.1rem] leading-[0.95] text-ivory">
                  {perfume.name}
                </p>
                <p className="mt-1.5 text-[0.78rem] text-ivory/60">
                  {perfume.house}
                  {perfume.year ? ` · ${perfume.year}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-ink/10 bg-ivory-soft px-4 py-3">
                <p className="text-[0.55rem] uppercase tracking-[0.14em] text-ink/32">Price tier</p>
                <p className="mt-1 text-[0.82rem] font-medium">{priceTierLabel(perfume.priceTier)}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-ivory-soft px-4 py-3">
                <p className="text-[0.55rem] uppercase tracking-[0.14em] text-ink/32">Wearing</p>
                <p className="mt-1 text-[0.82rem] font-medium">
                  {perfume.gender === "unisex" ? "Unisex" : perfume.gender === "men" ? "Men's" : "Women's"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/catalogue?family=${perfume.familySlug ?? ""}`}
                className="rounded-full border border-ink/12 bg-ivory-soft px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-ink/55 transition hover:border-ink/30"
              >
                {perfume.family}
              </Link>
              {cluster && (
                <Link
                  href={`/catalogue?cluster=${cluster.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-ivory-soft px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-ink/55 transition hover:border-ink/30"
                >
                  <span className="size-1.5 rounded-full" style={{ background: cluster.color }} />
                  {cluster.name}
                </Link>
              )}
              <span className="text-[0.62rem] uppercase tracking-[0.1em] text-ink/30">
                {formatYear(perfume.year)}
              </span>
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.8rem,5.6vw,4.8rem)] leading-[0.94]">
              {perfume.name}
            </h1>
            <p className="mt-2 font-display text-[1.25rem] italic text-ink/45">{perfume.house}</p>

            <p className="mt-6 max-w-xl text-[0.92rem] leading-relaxed text-ink/65">
              {perfume.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {perfume.character.map((word) => (
                <span
                  key={word}
                  className="rounded-full bg-ink/5 px-3 py-1.5 text-[0.66rem] capitalize text-ink/55"
                >
                  {word}
                </span>
              ))}
              {perfume.seasons.map((season) => (
                <span
                  key={season}
                  className="rounded-full border border-ink/10 px-3 py-1.5 text-[0.66rem] text-ink/55"
                >
                  {seasonLabel(season)}
                </span>
              ))}
              {perfume.times.map((time) => (
                <span
                  key={time}
                  className="rounded-full border border-ink/10 px-3 py-1.5 text-[0.66rem] text-ink/55"
                >
                  {timeLabel(time)}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <PersonalMatch perfumeId={perfume.id} name={perfume.name} />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
          <div className="rounded-[2rem] border border-ink/10 bg-ivory-soft p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-amber-dark">The composition</p>
              <span className="text-[0.6rem] uppercase tracking-[0.14em] text-ink/30">
                {perfume.notes.length} notes
              </span>
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.4vw,2.7rem)] leading-none">
              Top, heart, base
            </h2>
            <NotePyramid
              topNotes={perfume.topNotes}
              heartNotes={perfume.heartNotes}
              baseNotes={perfume.baseNotes}
              accent={perfume.familyColor ?? "#C8963E"}
              className="mt-7"
            />
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
              <p className="eyebrow text-amber-dark">Family composition</p>
              <p className="mt-2 text-[0.74rem] leading-relaxed text-ink/45">
                Weighted from the note pyramid, then normalised. This is the vector the model
                compares across the catalogue.
              </p>
              <div className="mt-5 space-y-3">
                {weights.map((entry) => (
                  <div key={entry.family!.slug}>
                    <div className="flex items-center justify-between text-[0.66rem] text-ink/55">
                      <span>{entry.family!.name}</span>
                      <span>{Math.round(entry.value * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/6">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, entry.value * 100)}%`,
                          background: entry.family!.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {cluster && (
              <div className="rounded-[2rem] bg-ink p-6 text-ivory sm:p-7">
                <p className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-light/75">
                  Learned cluster
                </p>
                <h3 className="mt-2 font-display text-[1.6rem] leading-tight">{cluster.name}</h3>
                <p className="mt-2 text-[0.74rem] leading-relaxed text-ivory/45">
                  {cluster.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {cluster.topNotes.map((note) => (
                    <span
                      key={note}
                      className="rounded-full border border-ivory/12 px-2.5 py-1 text-[0.58rem] text-ivory/55"
                    >
                      {note}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-ivory/30">
                    {cluster.size} perfumes
                  </span>
                  <Link
                    href={`/catalogue?cluster=${cluster.id}`}
                    className="inline-flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.12em] text-amber-light transition hover:text-ivory"
                  >
                    Explore <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] border border-ink/10 bg-ivory-soft p-6">
              <p className="flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.14em] text-ink/40">
                <Layers3 className="size-3.5" /> Coordinates
              </p>
              <p className="mt-2 font-mono text-[0.72rem] text-ink/50">
                {perfume.coordinates
                  ? `x ${perfume.coordinates[0].toFixed(3)} · y ${perfume.coordinates[1].toFixed(3)}`
                  : "Not projected"}
              </p>
              <p className="mt-2 text-[0.64rem] leading-relaxed text-ink/35">
                PCA projection of the note-family vector, scaled to the catalogue bounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section id="similar" className="container-page mt-20">
          <SectionHeading
            eyebrow="Nearest in the space"
            title={
              <>
                If this feels right,
                <br />
                <span className="italic text-ink/50">try these next.</span>
              </>
            }
            description="Ranked by cosine similarity in the note-family vector space — the same representation behind every recommendation."
            action={{ href: `/catalogue?family=${perfume.familySlug ?? ""}`, label: "More in this family" }}
          />
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {similar.map((item) => (
              <PerfumeCard key={item.id} perfume={item} compact />
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-ink/10 bg-ivory-soft px-6 py-5">
          <p className="flex items-center gap-2 text-[0.72rem] text-ink/45">
            <Sparkles className="size-3.5 text-amber-dark" />
            Want a shortlist scored against your own taste?
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/discover"
              className="rounded-full bg-ink px-5 py-2.5 text-[0.74rem] font-medium text-ivory transition hover:bg-ink-soft"
            >
              See my matches
            </Link>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-[0.74rem] font-medium text-ink/60 transition hover:border-ink/35"
            >
              <ArrowLeft className="size-3.5" /> Catalogue
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}

function DetailFallback() {
  return (
    <div className="container-page pt-8">
      <div className="skeleton h-3 w-40 rounded-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="skeleton aspect-[4/5] rounded-[2rem]" />
        <div className="space-y-4 pt-4">
          <div className="skeleton h-4 w-28 rounded-full" />
          <div className="skeleton h-14 w-3/4 rounded-2xl" />
          <div className="skeleton h-4 w-1/3 rounded-full" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-[1.8rem]" />
        </div>
      </div>
    </div>
  );
}
