import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Database, GitBranch, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import metricsJson from "@/data/metrics.json";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { getCatalogue, getStats } from "@/lib/catalogue";
import { META } from "@/lib/meta";
import { percentage } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The method",
  description:
    "How ScentIQ works: note-family vectors, TF-IDF and SVD, K-Means clustering, simulated taste profiles, a decision tree, and a hybrid ranker with explanations.",
};

interface Metrics {
  model: string;
  k: number;
  features: string[];
  parameters: {
    max_depth: number;
    min_samples_leaf: number;
    class_weight: string;
    test_size: number;
  };
  rows: { total: number; train: number; test: number };
  users: { total: number; train: number; test: number; overlap: number };
  positive_rate: number;
  classification: {
    accuracy: number;
    balanced_accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    confusion_matrix: number[][];
  };
  ranking: {
    precision_at_10: number;
    recall_at_10: number;
    ndcg_at_10: number;
    lift_over_family_baseline: number;
  };
  baseline_ranking: { precision_at_10: number; recall_at_10: number; ndcg_at_10: number };
  tree: { depth: number; leaves: number; nodes: number };
  top_features: { feature: string; importance: number }[];
}

const metrics = metricsJson as Metrics;
const catalogue = getCatalogue();

const PIPELINE = [
  {
    number: "01",
    title: "Normalise the catalogue",
    icon: Database,
    body: "Scento CSVs are merged into one perfume table. Note strings are normalised, each note is mapped into 14 scent families, and pyramid positions are weighted: top 0.8, heart 1.0, base 1.25. Notes that cannot be mapped are kept as unknown instead of guessed.",
    meta: "1,478 perfumes · 160 houses · 99.77% note coverage",
  },
  {
    number: "02",
    title: "Build a scent vector",
    icon: Layers3,
    body: "Each perfume becomes a document of family and note tokens. TF-IDF (min_df 2, max_df 0.92, sublinear term frequency) feeds a 32-component Truncated SVD; the result is L2-normalised so cosine similarity is a clean 0–1 signal. A separate PCA projection places every perfume on the 2-D scent map.",
    meta: "32 dimensions · tf-idf → SVD → normalise",
  },
  {
    number: "03",
    title: "Cluster the space",
    icon: Sparkles,
    body: "K-Means is fitted across candidate k values and scored with cosine silhouette, requiring every cluster to hold at least 20 perfumes. The chosen k is 6. Clusters are named from their dominant family and most frequent notes — not from sparse, high-lift notes that would mislabel a broad group.",
    meta: "k = 6 · silhouette 0.154 · sizes 131–358",
  },
  {
    number: "04",
    title: "Simulate taste, honestly",
    icon: GitBranch,
    body: "Twelve archetypes (Oud Royalist, Fresh Citric, White Floral Minimalist…) generate 30 users each. A user's hidden preference vector creates labels, but the model never sees it. Observed features are rebuilt from their likes: 75% history family mean and 25% loved-note weights. Wardrobes are held out of candidate sets.",
    meta: "360 users · 57,600 pairs · 30% positives",
  },
  {
    number: "05",
    title: "Learn the decision boundary",
    icon: GitBranch,
    body: "A depth-6 decision tree learns which candidates a user with those observed preferences enjoys. The split is grouped by user so no taste profile leaks across train and test. The target is the top 30% of a noisy hidden-vector score, so the ceiling is deliberately imperfect.",
    meta: "60 leaves · 270 train / 90 test users · 0 overlap",
  },
  {
    number: "06",
    title: "Rank, diversify, explain",
    icon: ShieldCheck,
    body: "The live shortlist blends content similarity (40%), tree probability (30%), cluster affinity (20%) and catalogue quality (10%), then applies MMR diversity at λ 0.72. Every item carries plain-language reasons and honest conflicts drawn from the same features.",
    meta: "40/30/20/10 · MMR λ 0.72 · reasons per item",
  },
];

const LIMITATIONS = [
  "The training users are simulated, not real people. The tree learns archetype-level patterns — it does not claim to read an individual.",
  "The catalogue leans towards designer and accessible niche houses. Price tiers are estimated, not retail prices.",
  "Mapping notes into 14 families is a modelling choice. Ambiguous notes (musk, amber, woods) collapse several materials into one signal.",
  "Six clusters keep the map readable but are coarse for oud, spice and leather; cluster affinity is a component, not the whole decision.",
  "There is no longevity, sillage or reformulation data. A match is about character, not performance on skin.",
];

export default function AboutPage() {
  const stats = getStats();
  const [trueNegative, falsePositive] = metrics.classification.confusion_matrix[0];
  const [falseNegative, truePositive] = metrics.classification.confusion_matrix[1];
  const current = catalogue.generatedAt
    ? new Date(catalogue.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "the latest pipeline run";

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="pointer-events-none absolute -left-20 top-0 size-[30rem] rounded-full bg-amber/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-moss/10 blur-3xl" />
        <div className="container-page relative py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow text-amber-light/85">The method</p>
            <h1 className="mt-4 font-display text-[clamp(2.8rem,6.2vw,5.4rem)] leading-[0.94]">
              A small system,
              <br />
              <span className="italic text-ivory/55">measured honestly.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ivory/55 md:text-[0.95rem]">
              ScentIQ is a content-based recommender with a supervised second opinion. This page
              documents what it actually learned, where it is weak, and why each number exists.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: stats.perfumes.toLocaleString(), label: "Perfumes" },
              { value: metrics.users.total, label: "Simulated users" },
              { value: metrics.features.length, label: "Model features" },
              { value: metrics.tree.leaves, label: "Tree leaves" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.4rem] border border-ivory/10 bg-ivory/[0.03] px-4 py-5"
              >
                <p className="font-display text-[2rem] leading-none">{stat.value}</p>
                <p className="mt-2 text-[0.55rem] uppercase tracking-[0.14em] text-ivory/35">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-[0.62rem] uppercase tracking-[0.16em] text-ivory/30">
            Last pipeline run · {current}
          </p>
        </div>
      </section>

      <section className="container-page py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Pipeline"
            title={
              <>
                Six steps, each
                <br />
                <span className="italic text-ink/50">auditable.</span>
              </>
            }
            description="Nothing is hand-waved. Every artifact on this page is reproducible from the repository with one command, from the raw CSVs to the tree rules."
          />
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-[2rem] border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={Math.min(index * 0.04, 0.2)} className="bg-ivory-soft">
                <div className="flex h-full flex-col p-6 lg:p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-full border border-ink/12 text-ink/60">
                      <Icon className="size-[17px]" strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-[1.5rem] text-ink/18">{step.number}</span>
                  </div>
                  <h3 className="mt-6 font-display text-[1.45rem] leading-[1.05]">{step.title}</h3>
                  <p className="mt-3 flex-1 text-[0.78rem] leading-relaxed text-ink/55">
                    {step.body}
                  </p>
                  <p className="mt-5 border-t border-ink/8 pt-3 font-mono text-[0.6rem] leading-relaxed text-ink/35">
                    {step.meta}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="clusters" className="border-y border-ink/10 bg-ivory-deep/35 py-20 lg:py-28">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              eyebrow="K-Means · k = 6"
              title={
                <>
                  The neighbourhoods
                  <br />
                  <span className="italic text-ink/50">the model found.</span>
                </>
              }
              description="Clusters are computed on note-family vectors, so they describe scent structure rather than price or brand. Names combine the dominant family with the notes that are genuinely frequent in the group."
            />
          </Reveal>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {META.clusters.map((cluster, index) => (
              <Reveal key={cluster.id} delay={Math.min(index * 0.04, 0.2)}>
                <Link
                  href={`/catalogue?cluster=${cluster.id}`}
                  className="group flex h-full flex-col rounded-[1.6rem] border border-ink/10 bg-ivory-soft p-6 transition hover:border-ink/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="size-2.5 rounded-full" style={{ background: cluster.color }} />
                    <span className="text-[0.56rem] uppercase tracking-[0.14em] text-ink/32">
                      {cluster.size} perfumes
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-[1.55rem] leading-[1.05]">
                    {cluster.name}
                  </h3>
                  <p className="mt-2 flex-1 text-[0.74rem] leading-relaxed text-ink/50">
                    {cluster.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.topNotes.slice(0, 3).map((note) => (
                        <span
                          key={note}
                          className="rounded-full border border-ink/10 px-2.5 py-1 text-[0.56rem] text-ink/50"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-ink/25 transition group-hover:text-ink/60" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Model card"
            title={
              <>
                What the tree
                <br />
                <span className="italic text-ink/50">can and cannot do.</span>
              </>
            }
            description="Test metrics come from 90 held-out users — never seen during training. The label is noisy by construction, so 61% accuracy is not a failure of the model; it is the honest signal in a deliberately unpredictable target."
            action={{ href: "/discover", label: "Try the ranker" }}
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-ink/10 bg-ivory-soft p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: percentage(metrics.classification.accuracy), label: "Accuracy", note: "held-out users" },
                { value: metrics.classification.roc_auc.toFixed(3), label: "ROC-AUC", note: "ranking quality" },
                { value: percentage(metrics.ranking.precision_at_10), label: "Precision @ 10", note: "top-10 relevance" },
                { value: `${metrics.ranking.lift_over_family_baseline.toFixed(2)}×`, label: "Lift", note: "over family baseline" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-display text-[clamp(2rem,3.4vw,2.7rem)] leading-none">
                    {item.value}
                  </p>
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.14em] text-ink/45">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[0.58rem] text-ink/30">{item.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 space-y-2.5 border-t border-ink/8 pt-5 text-[0.7rem]">
              {[
                ["Balanced accuracy", metrics.classification.balanced_accuracy.toFixed(3)],
                ["Precision / recall", `${metrics.classification.precision.toFixed(3)} / ${metrics.classification.recall.toFixed(3)}`],
                ["F1", metrics.classification.f1.toFixed(3)],
                ["NDCG @ 10", metrics.ranking.ndcg_at_10.toFixed(3)],
                ["Family baseline P@10", metrics.baseline_ranking.precision_at_10.toFixed(3)],
                ["Tree structure", `${metrics.tree.depth} levels · ${metrics.tree.leaves} leaves · ${metrics.tree.nodes} nodes`],
                ["Training rows", `${metrics.rows.train.toLocaleString()} train · ${metrics.rows.test.toLocaleString()} test`],
                ["Group split", `${metrics.users.train} / ${metrics.users.test} users · overlap ${metrics.users.overlap}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-ink/6 pb-2 last:border-0">
                  <span className="text-ink/40">{label}</span>
                  <span className="font-mono text-[0.66rem] text-ink/65">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-[0.62rem]">
              <div className="rounded-xl bg-moss/10 px-3 py-2 text-moss">
                True negatives · {trueNegative.toLocaleString()}
              </div>
              <div className="rounded-xl bg-rose/10 px-3 py-2 text-rose-deep">
                False positives · {falsePositive.toLocaleString()}
              </div>
              <div className="rounded-xl bg-rose/10 px-3 py-2 text-rose-deep">
                False negatives · {falseNegative.toLocaleString()}
              </div>
              <div className="rounded-xl bg-moss/10 px-3 py-2 text-moss">
                True positives · {truePositive.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-ink p-6 text-ivory sm:p-8">
            <p className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-light/75">
              Feature importance
            </p>
            <h3 className="mt-2 font-display text-[1.9rem] leading-tight">
              What the split actually uses
            </h3>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-ivory/40">
              Gini importance summed across the tree. Interactions matter more than any single
              feature, so read these as proportions, not causes.
            </p>

            <div className="mt-6 space-y-3">
              {metrics.top_features.slice(0, 6).map((feature) => (
                <div key={feature.feature}>
                  <div className="flex items-center justify-between text-[0.66rem] text-ivory/55">
                    <span className="font-mono text-[0.62rem]">{feature.feature}</span>
                    <span>{percentage(feature.importance)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory/10">
                    <div
                      className="h-full rounded-full bg-amber"
                      style={{ width: `${Math.max(1, feature.importance * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 border-t border-ivory/8 pt-4 text-[0.64rem] leading-relaxed text-ivory/35">
              Note overlap and avoid-conflict have zero tree importance because they are handled
              explicitly in the content score and conflict penalty. The tree is one voice in the
              ensemble, not the whole decision.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 rounded-[2rem] border border-ink/10 bg-ivory-soft p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow text-amber-dark">Final score</p>
            <h3 className="mt-2 font-display text-[2rem] leading-none">
              A weighted conversation
            </h3>
            <p className="mt-3 text-[0.78rem] leading-relaxed text-ink/50">
              No component can dominate silently. The content score is itself a blend of family
              cosine and vector similarity, with note overlap folded in when a loved note exists.
              MMR then trades a little relevance for variety.
            </p>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full">
              <div className="bg-amber" style={{ width: "40%" }} />
              <div className="bg-moss" style={{ width: "30%" }} />
              <div className="bg-rose" style={{ width: "20%" }} />
              <div className="bg-oud" style={{ width: "10%" }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[0.62rem] sm:grid-cols-4">
              {[
                { dot: "bg-amber", label: "Content 40%" },
                { dot: "bg-moss", label: "Tree 30%" },
                { dot: "bg-rose", label: "Cluster 20%" },
                { dot: "bg-oud", label: "Quality 10%" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-ink/45">
                  <span className={`size-1.5 rounded-full ${item.dot}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[1.4rem] bg-ink p-5 font-mono text-[0.68rem] leading-relaxed text-ivory/60">
            <p className="text-ivory/30">score =</p>
            <p className="mt-2">
              0.40 · <span className="text-amber-light">content</span>
            </p>
            <p>
              + 0.30 · <span className="text-[#a9b892]">tree_probability</span>
            </p>
            <p>
              + 0.20 · <span className="text-[#d9a3ad]">cluster_affinity</span>
            </p>
            <p>
              + 0.10 · <span className="text-[#c1a78f]">catalogue_quality</span>
            </p>
            <p>
              − 0.12 · <span className="text-[#e09b9b]">avoid_conflict</span>
            </p>
            <p className="mt-3 text-ivory/30">
              content = 0.55 · family_cosine
              <br />
              <span className="ml-[4.4rem]">+ 0.45 · vector_similarity</span>
            </p>
            <p className="mt-3 text-ivory/30">after: MMR λ 0.72 → top 24</p>
          </div>
        </div>
      </section>

      <section id="data" className="border-y border-ink/10 bg-ivory-deep/35 py-20 lg:py-28">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow text-amber-dark">Data & ethics</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.02]">
              Honest about
              <br />
              <span className="italic text-ink/50">what this is.</span>
            </h2>
            <p className="mt-4 max-w-md text-[0.84rem] leading-relaxed text-ink/55">
              This is a university project built to be genuinely usable, not a commercial rating
              platform. It does not scrape Fragrantica, invent reviews or pretend to know how a
              perfume performs on your skin.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[0.62rem]">
              <span className="rounded-full border border-ink/12 bg-ivory-soft px-3 py-1.5">
                Scento Perfume Database
              </span>
              <span className="rounded-full border border-ink/12 bg-ivory-soft px-3 py-1.5">
                CC BY 4.0
              </span>
              <span className="rounded-full border border-ink/12 bg-ivory-soft px-3 py-1.5">
                No affiliation with brands
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "No real-user surveillance",
                body: "The training set is synthetic. No ratings, accounts or browsing behaviour were collected. Your profile is a local object, not a server record.",
              },
              {
                title: "No hidden-vector leakage",
                body: "Each simulated user has a latent preference vector; it creates labels but is never a feature. A grouped split keeps every user on one side of train/test, asserted in the test suite.",
              },
              {
                title: "Labelled uncertainty",
                body: "Price tiers are estimates. Note coverage, unmapped notes and cluster sizes are reported rather than smoothed away. The UI discloses conflicts instead of hiding them.",
              },
              {
                title: "Free to run",
                body: "The stack is designed for free tiers: Next.js on Vercel, FastAPI on Render, Supabase as optional system of record, with keep-alive automation. Nothing here requires a paid key to demonstrate.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.4rem] border border-ink/10 bg-ivory-soft p-5"
              >
                <p className="flex items-center gap-2 text-[0.8rem] font-medium">
                  <ShieldCheck className="size-3.5 text-moss" />
                  {item.title}
                </p>
                <p className="mt-2 text-[0.74rem] leading-relaxed text-ink/50">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="limitations" className="container-page py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="eyebrow text-amber-dark">Limitations</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.02]">
              Where it
              <br />
              <span className="italic text-ink/50">breaks.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[0.8rem] leading-relaxed text-ink/50">
              A recommendation system that cannot name its failure modes is a demo. These are the
              known ones, in order of impact.
            </p>
          </div>
          <ol className="space-y-4">
            {LIMITATIONS.map((limitation, index) => (
              <li key={limitation} className="flex gap-4 border-b border-ink/8 pb-4 last:border-0">
                <span className="font-mono text-[0.66rem] text-ink/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[0.8rem] leading-relaxed text-ink/60">{limitation}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page">
        <div className="rounded-[2.2rem] bg-ink px-6 py-10 text-ivory sm:px-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <p className="text-[0.56rem] uppercase tracking-[0.18em] text-amber-light/75">
                Built with
              </p>
              <p className="mt-3 font-display text-[1.9rem] leading-[1.05]">
                Next.js · FastAPI · scikit-learn · pandas · Supabase (planned)
              </p>
              <p className="mt-3 text-[0.72rem] leading-relaxed text-ivory/40">
                Reproducible from raw data with the ML pipeline; deployed on free tiers with CI,
                keep-alive automation and an on-device fallback ranker.
              </p>
            </div>
            <a
              href="https://github.com/hashiransari3000/Scent-IQ"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ivory px-5 py-3 text-[0.76rem] font-semibold text-ink transition hover:bg-amber-light"
            >
              Source on GitHub <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
        <p className="mt-6 text-center text-[0.62rem] leading-relaxed text-ink/32">
          {catalogue.attribution} · Metrics from the latest local pipeline run · ScentIQ is an
          independent project, not affiliated with any house.
        </p>
      </section>
    </div>
  );
}
