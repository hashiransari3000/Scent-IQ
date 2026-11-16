"use client";

import { ArrowRight, Check, Heart, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChoiceChip } from "@/components/choice-chip";
import { FamilyArt } from "@/components/family-art";
import { fetchCatalogue } from "@/lib/api";
import { META } from "@/lib/meta";
import { hasProfile, toggleValue, useProfile } from "@/lib/profile";
import type { Perfume, Season, TimeOfDay, UserProfile } from "@/lib/types";
import { cn, priceTierLabel } from "@/lib/utils";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const TIMES: TimeOfDay[] = ["day", "evening", "night"];

export default function ProfilePage() {
  const { profile, update, reset } = useProfile();
  const ready = hasProfile(profile);
  const [lovedItems, setLovedItems] = useState<Perfume[]>([]);
  const [noteMode, setNoteMode] = useState<"love" | "avoid">("love");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const lovedKey = profile.lovedIds.join(",");

  useEffect(() => {
    const ids = lovedKey ? lovedKey.split(",") : [];
    if (!ids.length) {
      setLovedItems([]);
      return;
    }
    let cancelled = false;
    fetchCatalogue({ ids, limit: 100 })
      .then((response) => {
        if (!cancelled) setLovedItems(response.items);
      })
      .catch(() => {
        if (!cancelled) setLovedItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lovedKey]);

  const completion = useMemo(() => {
    let score = 0;
    if (profile.families.length) score += 20;
    if (profile.lovedIds.length) score += 25;
    if (profile.loveNotes.length) score += 20;
    if (profile.seasons.length) score += 15;
    if (profile.times.length) score += 5;
    if (profile.budgetTier) score += 10;
    if (profile.gender !== "any") score += 5;
    return Math.min(100, score);
  }, [profile]);

  const familyNames = profile.families.map(
    (slug) => META.families.find((family) => family.slug === slug)?.name ?? slug,
  );

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    update({ ...profile, [key]: value });

  const toggleNote = (note: string) => {
    if (noteMode === "love") {
      const selected = profile.loveNotes.includes(note);
      update({
        ...profile,
        loveNotes: selected
          ? profile.loveNotes.filter((value) => value !== note)
          : toggleValue(profile.loveNotes, note, 10),
        avoidNotes: profile.avoidNotes.filter((value) => value !== note),
      });
      return;
    }
    const selected = profile.avoidNotes.includes(note);
    update({
      ...profile,
      avoidNotes: selected
        ? profile.avoidNotes.filter((value) => value !== note)
        : toggleValue(profile.avoidNotes, note, 8),
      loveNotes: profile.loveNotes.filter((value) => value !== note),
    });
  };

  const removeLoved = (id: string) => {
    const feedback = { ...profile.feedback };
    delete feedback[id];
    update({ ...profile, lovedIds: profile.lovedIds.filter((value) => value !== id), feedback });
  };

  const notes = showAllNotes ? META.notes : META.notes.slice(0, 54);

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-ink/10 bg-ivory-soft">
        <div className="pointer-events-none absolute -right-32 -top-24 size-[26rem] rounded-full bg-amber/10 blur-3xl" />
        <div className="container-page relative py-12 md:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-amber-dark">Your profile</p>
              <h1 className="mt-3 font-display text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[0.96]">
                Your taste,
                <br />
                <span className="italic text-ink/50">on record.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
                Everything here is stored in this browser and sent only when a recommendation is
                requested. Change anything — the next shortlist updates with it.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-[1.6rem] border border-ink/10 bg-ivory p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[0.55rem] uppercase tracking-[0.16em] text-ink/35">
                    Profile signal
                  </p>
                  <p className="mt-1 font-display text-[2.4rem] leading-none">{completion}%</p>
                </div>
                <span className="text-[0.58rem] uppercase tracking-[0.1em] text-ink/30">
                  {ready ? "Active" : "Empty"}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full bg-amber transition-[width] duration-700"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-3 text-[0.62rem] leading-relaxed text-ink/35">
                {ready
                  ? "Enough signal for a ranked shortlist. More detail sharpens the edges."
                  : "Add a family, a note or a perfume to activate recommendations."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[0.78rem] font-semibold text-ivory transition hover:bg-ink-soft"
            >
              <Sparkles className="size-3.5 text-amber-light" />
              See my matches
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-[0.78rem] font-medium text-ink/60 transition hover:border-ink/35 hover:text-ink"
            >
              Guided setup <ArrowRight className="size-3.5" />
            </Link>
            {confirmReset ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-[0.7rem] text-ink/45">
                Delete this profile?
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                  }}
                  className="rounded-full bg-rose px-4 py-2 text-[0.66rem] font-medium text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-full border border-ink/15 px-4 py-2 text-[0.66rem] font-medium"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-[0.7rem] font-medium text-ink/35 transition hover:text-rose-deep"
              >
                <RotateCcw className="size-3" /> Reset profile
              </button>
            )}
          </div>
        </div>
      </section>

      {!ready ? (
        <section className="container-page pt-12">
          <div className="rounded-[2rem] border border-dashed border-ink/20 bg-ivory-soft p-8 text-center sm:p-14">
            <p className="font-display text-[2rem]">Nothing on record yet.</p>
            <p className="mx-auto mt-3 max-w-md text-[0.84rem] leading-relaxed text-ink/50">
              Build a profile in the guided flow, or start editing below. A single scent family is
              enough to produce a first shortlist.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.8rem] font-semibold text-ivory"
            >
              <Sparkles className="size-4 text-amber-light" /> Build my profile
            </Link>
          </div>
        </section>
      ) : null}

      <section className="container-page mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-8">
        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-amber-dark">Wardrobe</p>
                <h2 className="mt-2 font-display text-[1.8rem] leading-none">
                  {profile.lovedIds.length} perfume{profile.lovedIds.length === 1 ? "" : "s"}
                </h2>
              </div>
              <Link
                href="/onboarding"
                className="text-[0.66rem] uppercase tracking-[0.12em] text-ink/40 transition hover:text-ink"
              >
                Add more
              </Link>
            </div>

            {lovedItems.length === 0 ? (
              <p className="mt-4 text-[0.8rem] leading-relaxed text-ink/45">
                {profile.lovedIds.length
                  ? "Loading your wardrobe…"
                  : "No perfumes added yet. Loves from the shortlist appear here automatically."}
              </p>
            ) : (
              <div className="mt-5 space-y-1.5">
                {lovedItems.map((perfume) => (
                  <div
                    key={perfume.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-ivory p-2"
                  >
                    <FamilyArt
                      slug={perfume.familySlug}
                      seed={perfume.id}
                      className="size-12 shrink-0 rounded-xl"
                      label={false}
                      overlay={false}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/perfume/${perfume.id}`}
                        className="block truncate text-[0.82rem] font-medium hover:text-amber-dark"
                      >
                        {perfume.name}
                      </Link>
                      <p className="truncate text-[0.62rem] text-ink/40">
                        {perfume.house} · {perfume.family}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLoved(perfume.id)}
                      aria-label={`Remove ${perfume.name} from wardrobe`}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-ink/30 transition hover:bg-rose/10 hover:text-rose-deep"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
            <p className="eyebrow text-amber-dark">Families</p>
            <h2 className="mt-2 font-display text-[1.8rem] leading-none">What pulls you in</h2>
            <p className="mt-2 text-[0.72rem] text-ink/40">Up to five. Tap to toggle.</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {META.families.map((family) => (
                <ChoiceChip
                  key={family.slug}
                  selected={profile.families.includes(family.slug)}
                  onClick={() =>
                    set(
                      "families",
                      profile.families.includes(family.slug)
                        ? profile.families.filter((slug) => slug !== family.slug)
                        : toggleValue(profile.families, family.slug, 5),
                    )
                  }
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: family.color }}
                  />
                  {family.name}
                </ChoiceChip>
              ))}
            </div>
            {familyNames.length > 0 && (
              <p className="mt-4 text-[0.68rem] text-ink/40">
                Selected: <span className="text-ink/65">{familyNames.join(" · ")}</span>
              </p>
            )}
          </div>

          <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-amber-dark">Notes</p>
                <h2 className="mt-2 font-display text-[1.8rem] leading-none">
                  Love and avoid
                </h2>
              </div>
              <div className="inline-flex rounded-full border border-ink/10 bg-ivory p-1">
                <button
                  type="button"
                  onClick={() => setNoteMode("love")}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[0.68rem] font-medium transition",
                    noteMode === "love" ? "bg-ink text-ivory" : "text-ink/50",
                  )}
                >
                  <Heart className="mr-1 inline size-3" /> Love
                </button>
                <button
                  type="button"
                  onClick={() => setNoteMode("avoid")}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[0.68rem] font-medium transition",
                    noteMode === "avoid" ? "bg-rose text-white" : "text-ink/50",
                  )}
                >
                  <X className="mr-1 inline size-3" /> Avoid
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {notes.map(({ name, count }) => {
                const selected =
                  noteMode === "love"
                    ? profile.loveNotes.includes(name)
                    : profile.avoidNotes.includes(name);
                return (
                  <ChoiceChip
                    key={name}
                    selected={selected}
                    tone={noteMode === "avoid" ? "rose" : "ink"}
                    showCheck
                    onClick={() => toggleNote(name)}
                  >
                    {name}
                    <span className="opacity-40">{count}</span>
                  </ChoiceChip>
                );
              })}
            </div>
            {!showAllNotes && (
              <button
                type="button"
                onClick={() => setShowAllNotes(true)}
                className="mt-4 text-[0.66rem] font-medium uppercase tracking-[0.12em] text-amber-dark"
              >
                Show all {META.notes.length} notes
              </button>
            )}

            <div className="mt-5 grid gap-3 border-t border-ink/8 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[0.56rem] uppercase tracking-[0.14em] text-ink/32">
                  Loved notes ({profile.loveNotes.length})
                </p>
                <p className="mt-1 text-[0.74rem] leading-relaxed text-ink/65">
                  {profile.loveNotes.join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-[0.56rem] uppercase tracking-[0.14em] text-ink/32">
                  Avoided notes ({profile.avoidNotes.length})
                </p>
                <p className="mt-1 text-[0.74rem] leading-relaxed text-ink/65">
                  {profile.avoidNotes.join(" · ") || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
            <p className="eyebrow text-amber-dark">Fit</p>
            <h2 className="mt-2 font-display text-[1.8rem] leading-none">
              Seasons, hours, budget
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink/35">Season</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SEASONS.map((season) => (
                    <ChoiceChip
                      key={season}
                      selected={profile.seasons.includes(season)}
                      onClick={() =>
                        set(
                          "seasons",
                          profile.seasons.includes(season)
                            ? profile.seasons.filter((value) => value !== season)
                            : [...profile.seasons, season],
                        )
                      }
                    >
                      {season.charAt(0).toUpperCase() + season.slice(1)}
                    </ChoiceChip>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink/35">Time of day</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TIMES.map((time) => (
                    <ChoiceChip
                      key={time}
                      selected={profile.times.includes(time)}
                      onClick={() =>
                        set(
                          "times",
                          profile.times.includes(time)
                            ? profile.times.filter((value) => value !== time)
                            : [...profile.times, time],
                        )
                      }
                    >
                      {time === "day" ? "Daytime" : time.charAt(0).toUpperCase() + time.slice(1)}
                    </ChoiceChip>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink/35">Budget</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <ChoiceChip
                      selected={profile.budgetTier === null}
                      onClick={() => set("budgetTier", null)}
                    >
                      Any
                    </ChoiceChip>
                    {META.priceTiers.map((tier) => (
                      <ChoiceChip
                        key={tier.tier}
                        selected={profile.budgetTier === tier.tier}
                        onClick={() => set("budgetTier", tier.tier)}
                      >
                        {priceTierLabel(tier.tier)}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink/35">Shop</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { value: "any", label: "No preference" },
                      { value: "women", label: "Women's" },
                      { value: "men", label: "Men's" },
                    ].map((option) => (
                      <ChoiceChip
                        key={option.value}
                        selected={profile.gender === option.value}
                        onClick={() => set("gender", option.value as UserProfile["gender"])}
                      >
                        {option.label}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-6 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-amber-dark">Feedback</p>
                <h2 className="mt-2 font-display text-[1.8rem] leading-none">Signals you gave</h2>
              </div>
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-ink/30">
                Auto-saved
              </p>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-ink/8">
              {[
                { value: profile.lovedIds.length, label: "Loved" },
                {
                  value: Object.values(profile.feedback).filter((value) => value === "dislike").length,
                  label: "Disliked",
                },
                { value: profile.excludeIds.length, label: "Excluded" },
              ].map((stat) => (
                <div key={stat.label} className="px-3 first:pl-0 last:pr-0">
                  <p className="font-display text-[1.7rem] leading-none">{stat.value}</p>
                  <p className="mt-1 text-[0.54rem] uppercase tracking-[0.12em] text-ink/32">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.68rem] leading-relaxed text-ink/38">
              A dislike removes a perfume from the next shortlist. A love adds it to your wardrobe
              and pulls the ranker toward its notes and cluster.
            </p>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.6rem] bg-ink p-6 text-ivory">
            <p className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-light/75">
              How this is used
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { weight: "40%", label: "Content similarity", text: "Notes and families compared in vector space." },
                { weight: "30%", label: "Predicted enjoyment", text: "Decision tree trained on simulated taste profiles." },
                { weight: "20%", label: "Cluster affinity", text: "Proximity to the learned clusters you wear." },
                { weight: "10%", label: "Catalogue quality", text: "Popularity and concentration, gently." },
              ].map((row) => (
                <li key={row.label} className="flex gap-3">
                  <span className="w-9 shrink-0 font-mono text-[0.62rem] text-amber-light">
                    {row.weight}
                  </span>
                  <span>
                    <span className="block text-[0.74rem] font-medium text-ivory/85">{row.label}</span>
                    <span className="mt-0.5 block text-[0.64rem] leading-relaxed text-ivory/38">
                      {row.text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.6rem] border border-ink/10 bg-ivory-soft p-5">
            <p className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-ink/40">
              <Check className="size-3.5 text-moss" /> Privacy
            </p>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-ink/45">
              This profile lives in <span className="font-mono text-[0.64rem]">localStorage</span>{" "}
              on this device. It is sent to the recommendation API only when scoring, and is never
              tied to an account.
            </p>
            <Link
              href="/about#data"
              className="mt-3 inline-flex items-center gap-1 text-[0.64rem] font-medium uppercase tracking-[0.1em] text-amber-dark"
            >
              Data & ethics <ArrowRight className="size-3" />
            </Link>
          </div>

          <Link
            href="/discover"
            className="flex items-center justify-between rounded-[1.6rem] border border-amber/40 bg-amber/10 p-5 transition hover:bg-amber/15"
          >
            <span>
              <span className="block font-display text-[1.2rem] leading-tight">See the shortlist</span>
              <span className="mt-1 block text-[0.62rem] text-ink/45">Re-ranked with these signals</span>
            </span>
            <ArrowRight className="size-4 text-amber-dark" />
          </Link>
        </aside>
      </section>
    </div>
  );
}
