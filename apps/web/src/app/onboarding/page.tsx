"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChoiceChip } from "@/components/choice-chip";
import { FamilyArt } from "@/components/family-art";
import { fetchCatalogue } from "@/lib/api";
import { META } from "@/lib/meta";
import { EMPTY_PROFILE, readProfile, toggleValue, useProfile } from "@/lib/profile";
import type { Perfume, Season, TimeOfDay, UserProfile } from "@/lib/types";
import { cn, priceTierLabel } from "@/lib/utils";

const STEPS = [
  {
    key: "families",
    title: "What pulls you in?",
    lead: "Start with the textures you gravitate towards. Pick up to five — or none, if you would rather let the notes speak first.",
  },
  {
    key: "notes",
    title: "Any notes you already know?",
    lead: "A single note can carry a whole memory. Tell us what you reach for, and what you would rather never meet again.",
  },
  {
    key: "wardrobe",
    title: "What do you wear now?",
    lead: "Add a few perfumes you own or love. This is the strongest signal we can use: we compare them across 14 note families.",
  },
  {
    key: "fit",
    title: "Where will it live?",
    lead: "Season, time of day and budget narrow the catalogue without hiding the interesting edges.",
  },
] as const;

const SEASONS: { value: Season; label: string; hint: string }[] = [
  { value: "spring", label: "Spring", hint: "green, dewy, light" },
  { value: "summer", label: "Summer", hint: "citrus, salt, air" },
  { value: "autumn", label: "Autumn", hint: "woods, spice, amber" },
  { value: "winter", label: "Winter", hint: "resins, oud, warmth" },
];

const TIMES: { value: TimeOfDay; label: string; hint: string }[] = [
  { value: "day", label: "Daytime", hint: "office, daylight" },
  { value: "evening", label: "Evening", hint: "dinner, out" },
  { value: "night", label: "Night", hint: "late, close" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { update } = useProfile();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [loved, setLoved] = useState<Perfume[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Perfume[]>([]);
  const [searching, setSearching] = useState(false);
  const [noteMode, setNoteMode] = useState<"love" | "avoid">("love");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readProfile();
    setDraft(saved);
    setHydrated(true);
    if (saved.lovedIds.length) {
      fetchCatalogue({ ids: saved.lovedIds, limit: 100 })
        .then((response) => setLoved(response.items))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [step, hydrated, reduce]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetchCatalogue({ q: needle, limit: 6 })
        .then((response) => {
          if (!cancelled) setResults(response.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const notes = useMemo(
    () => (showAllNotes ? META.notes : META.notes.slice(0, 54)),
    [showAllNotes],
  );

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleNote = (note: string) => {
    if (noteMode === "love") {
      const selected = draft.loveNotes.includes(note);
      setDraft((current) => ({
        ...current,
        loveNotes: selected
          ? current.loveNotes.filter((value) => value !== note)
          : toggleValue(current.loveNotes, note, 10),
        avoidNotes: current.avoidNotes.filter((value) => value !== note),
      }));
      return;
    }
    const selected = draft.avoidNotes.includes(note);
    setDraft((current) => ({
      ...current,
      avoidNotes: selected
        ? current.avoidNotes.filter((value) => value !== note)
        : toggleValue(current.avoidNotes, note, 8),
      loveNotes: current.loveNotes.filter((value) => value !== note),
    }));
  };

  const toggleLoved = (perfume: Perfume) => {
    setLoved((current) => {
      if (current.some((item) => item.id === perfume.id)) {
        return current.filter((item) => item.id !== perfume.id);
      }
      if (current.length >= 12) return current;
      return [...current, perfume];
    });
  };

  // Functional updates keep rapid taps from overwriting each other.
  const toggleFamily = (slug: string) =>
    setDraft((current) => ({
      ...current,
      families: current.families.includes(slug)
        ? current.families.filter((value) => value !== slug)
        : toggleValue(current.families, slug, 5),
    }));

  const toggleSeason = (season: Season) =>
    setDraft((current) => ({
      ...current,
      seasons: current.seasons.includes(season)
        ? current.seasons.filter((value) => value !== season)
        : [...current.seasons, season],
    }));

  const toggleTime = (time: TimeOfDay) =>
    setDraft((current) => ({
      ...current,
      times: current.times.includes(time)
        ? current.times.filter((value) => value !== time)
        : [...current.times, time],
    }));

  const finish = () => {
    update({ ...draft, lovedIds: loved.map((perfume) => perfume.id) });
    router.push("/discover");
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else router.push("/");
  };

  const selectedFamilyCount = draft.families.length;
  const stepInfo = STEPS[step];

  return (
    <div className="bg-ivory">
      <div className="container-page pb-24 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[0.68rem] uppercase tracking-[0.18em] text-ink/45 transition hover:text-ink"
          >
            ← ScentIQ
          </Link>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink/40">
            Step {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {STEPS.map((item, index) => (
            <div key={item.key} className="space-y-2">
              <div className="h-[3px] overflow-hidden rounded-full bg-ink/10">
                <motion.div
                  className="h-full rounded-full bg-ink"
                  initial={false}
                  animate={{ width: index <= step ? "100%" : "0%" }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p
                className={cn(
                  "text-[0.58rem] uppercase tracking-[0.16em] transition",
                  index === step ? "text-ink" : index < step ? "text-ink/55" : "text-ink/28",
                )}
              >
                {item.key}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="min-h-[3.5rem]">
            <p className="eyebrow text-amber-dark">Build your profile</p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.98]">
              {stepInfo.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">
              {stepInfo.lead}
            </p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10"
            >
              {step === 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {META.families.map((family) => {
                    const selected = draft.families.includes(family.slug);
                    const disabled = !selected && selectedFamilyCount >= 5;
                    return (
                      <button
                        key={family.slug}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => toggleFamily(family.slug)}
                        className={cn(
                          "group relative overflow-hidden rounded-[1.4rem] border text-left transition duration-300",
                          selected
                            ? "border-amber ring-2 ring-amber/40"
                            : "border-ink/10 hover:border-ink/30",
                          disabled && "opacity-40",
                        )}
                      >
                        <FamilyArt
                          slug={family.slug}
                          name={family.name}
                          seed={family.slug}
                          className="aspect-[5/4] transition-transform duration-700 group-hover:scale-[1.04]"
                          label={false}
                          overlay={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/50 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3.5">
                          <p className="font-display text-[1.08rem] leading-tight text-ivory">
                            {family.name}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[0.56rem] leading-relaxed text-ivory/60">
                            {family.description}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "absolute right-3 top-3 grid size-6 place-items-center rounded-full border transition",
                            selected
                              ? "border-amber bg-amber text-ink"
                              : "border-ivory/45 bg-ink/20 text-transparent backdrop-blur-sm",
                          )}
                        >
                          <Check className="size-3.5" strokeWidth={2.6} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 1 && (
                <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-full border border-ink/10 bg-ivory p-1">
                      <button
                        type="button"
                        onClick={() => setNoteMode("love")}
                        className={cn(
                          "rounded-full px-4 py-2 text-[0.72rem] font-medium transition",
                          noteMode === "love" ? "bg-ink text-ivory" : "text-ink/55 hover:text-ink",
                        )}
                      >
                        <Heart className="mr-1.5 inline size-3" /> Love ({draft.loveNotes.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteMode("avoid")}
                        className={cn(
                          "rounded-full px-4 py-2 text-[0.72rem] font-medium transition",
                          noteMode === "avoid"
                            ? "bg-rose text-white"
                            : "text-ink/55 hover:text-ink",
                        )}
                      >
                        <X className="mr-1.5 inline size-3" /> Avoid ({draft.avoidNotes.length})
                      </button>
                    </div>
                    <p className="text-[0.62rem] uppercase tracking-[0.14em] text-ink/35">
                      {noteMode === "love" ? "Up to ten notes" : "Up to eight notes"}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {notes.map(({ name, count }) => {
                      const selected =
                        noteMode === "love"
                          ? draft.loveNotes.includes(name)
                          : draft.avoidNotes.includes(name);
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
                      className="mt-5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-amber-dark"
                    >
                      Show all {META.notes.length} notes
                    </button>
                  )}

                  {(draft.loveNotes.length > 0 || draft.avoidNotes.length > 0) && (
                    <div className="mt-6 grid gap-3 border-t border-ink/8 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.16em] text-ink/35">
                          You love
                        </p>
                        <p className="mt-1.5 text-[0.78rem] text-ink/70">
                          {draft.loveNotes.join(" · ") || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.16em] text-ink/35">
                          You avoid
                        </p>
                        <p className="mt-1.5 text-[0.78rem] text-ink/70">
                          {draft.avoidNotes.join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-6">
                    <label htmlFor="wardrobe-search" className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                      Search the catalogue
                    </label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-ink/12 bg-ivory px-4">
                      <Search className="size-4 text-ink/35" strokeWidth={1.7} />
                      <input
                        id="wardrobe-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="A perfume, a house, a note…"
                        className="h-12 w-full bg-transparent text-[0.85rem] outline-none placeholder:text-ink/30"
                        autoComplete="off"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          aria-label="Clear search"
                          className="text-ink/35 hover:text-ink"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    {query.trim().length >= 2 && (
                      <div className="mt-3 divide-y divide-ink/6 overflow-hidden rounded-2xl border border-ink/8">
                        {searching && results.length === 0 && (
                          <p className="px-4 py-4 text-[0.76rem] text-ink/40">Searching…</p>
                        )}
                        {!searching && results.length === 0 && (
                          <p className="px-4 py-4 text-[0.76rem] text-ink/40">
                            Nothing matched “{query}”. Try a house or a single note.
                          </p>
                        )}
                        {results.map((perfume) => {
                          const selected = loved.some((item) => item.id === perfume.id);
                          return (
                            <button
                              key={perfume.id}
                              type="button"
                              onClick={() => toggleLoved(perfume)}
                              className="flex w-full items-center gap-3 bg-ivory-soft px-3 py-2.5 text-left transition hover:bg-amber/8"
                            >
                              <FamilyArt
                                slug={perfume.familySlug}
                                seed={perfume.id}
                                className="size-11 shrink-0 rounded-xl"
                                label={false}
                                overlay={false}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[0.82rem] font-medium">
                                  {perfume.name}
                                </span>
                                <span className="block truncate text-[0.66rem] text-ink/45">
                                  {perfume.house} · {perfume.family}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "grid size-7 shrink-0 place-items-center rounded-full border",
                                  selected
                                    ? "border-ink bg-ink text-ivory"
                                    : "border-ink/20 text-ink/50",
                                )}
                              >
                                {selected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                        Your wardrobe · {loved.length}/12
                      </p>
                      {loved.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setLoved([])}
                          className="text-[0.62rem] uppercase tracking-[0.12em] text-ink/35 hover:text-rose-deep"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {loved.length === 0 ? (
                      <p className="mt-4 text-[0.8rem] leading-relaxed text-ink/45">
                        Nothing here yet. Search above, or skip — families and notes are enough to
                        begin.
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {loved.map((perfume) => (
                          <span
                            key={perfume.id}
                            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ivory py-1 pl-3 pr-1.5 text-[0.74rem]"
                          >
                            {perfume.name}
                            <button
                              type="button"
                              onClick={() => toggleLoved(perfume)}
                              aria-label={`Remove ${perfume.name}`}
                              className="grid size-6 place-items-center rounded-full text-ink/40 transition hover:bg-ink/8 hover:text-ink"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-7">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                      Season
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {SEASONS.map((season) => {
                        const selected = draft.seasons.includes(season.value);
                        return (
                          <button
                            key={season.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleSeason(season.value)}
                            className={cn(
                              "rounded-2xl border px-4 py-4 text-left transition",
                              selected
                                ? "border-ink bg-ink text-ivory"
                                : "border-ink/10 bg-ivory hover:border-ink/30",
                            )}
                          >
                            <span className="block font-display text-[1.2rem]">
                              {season.label}
                            </span>
                            <span
                              className={cn(
                                "mt-1 block text-[0.6rem] uppercase tracking-[0.12em]",
                                selected ? "text-ivory/50" : "text-ink/35",
                              )}
                            >
                              {season.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-7">
                      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                        Time of day
                      </p>
                      <div className="mt-3 space-y-2">
                        {TIMES.map((time) => {
                          const selected = draft.times.includes(time.value);
                          return (
                            <button
                              key={time.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleTime(time.value)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                                selected
                                  ? "border-ink bg-ink text-ivory"
                                  : "border-ink/10 bg-ivory hover:border-ink/30",
                              )}
                            >
                              <span className="text-[0.8rem] font-medium">{time.label}</span>
                              <span
                                className={cn(
                                  "text-[0.6rem] uppercase tracking-[0.12em]",
                                  selected ? "text-ivory/45" : "text-ink/35",
                                )}
                              >
                                {time.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-7">
                      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                        Budget
                      </p>
                      <div className="mt-3 space-y-2">
                        {[{ tier: null, label: "Any budget", note: "No cap" }, ...META.priceTiers.map((tier) => ({ tier: tier.tier, label: priceTierLabel(tier.tier), note: tier.note }))].map(
                          (option) => {
                            const selected = draft.budgetTier === option.tier;
                            return (
                              <button
                                key={String(option.tier)}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => set("budgetTier", option.tier)}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                                  selected
                                    ? "border-ink bg-ink text-ivory"
                                    : "border-ink/10 bg-ivory hover:border-ink/30",
                                )}
                              >
                                <span className="text-[0.8rem] font-medium">{option.label}</span>
                                <span
                                  className={cn(
                                    "text-[0.6rem] uppercase tracking-[0.1em]",
                                    selected ? "text-ivory/45" : "text-ink/35",
                                  )}
                                >
                                  {option.note}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-7">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/40">
                      You usually shop
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { value: "any", label: "No preference" },
                        { value: "women", label: "Women's" },
                        { value: "men", label: "Men's" },
                      ].map((option) => (
                        <ChoiceChip
                          key={option.value}
                          selected={draft.gender === option.value}
                          onClick={() => set("gender", option.value as UserProfile["gender"])}
                        >
                          {option.label}
                        </ChoiceChip>
                      ))}
                      <span className="self-center text-[0.62rem] text-ink/35">
                        Unisex is always included.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-6">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-[0.76rem] font-medium text-ink/55 transition hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              {step === 0 ? "Home" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              {step > 0 && step < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="text-[0.7rem] uppercase tracking-[0.14em] text-ink/35 transition hover:text-ink"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.82rem] font-semibold text-ivory transition hover:bg-ink-soft"
              >
                {step === STEPS.length - 1 ? (
                  <>
                    <Sparkles className="size-4 text-amber-light" />
                    See my matches
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[0.62rem] leading-relaxed text-ink/32">
            Your profile stays in this browser. No account, no email, no tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
