import type { Metadata } from "next";
import { getFeatured } from "@/lib/catalogue";
import { DiscoverClient } from "./discover-client";

export const metadata: Metadata = {
  title: "For you",
  description:
    "Personalised fragrance recommendations scored by content similarity, a decision tree and cluster affinity — with an explanation for every match.",
};

export default function DiscoverPage() {
  return <DiscoverClient featured={getFeatured(4)} />;
}
