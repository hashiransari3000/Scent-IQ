import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/catalogue";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const catalogue = getCatalogue();
  const lastModified = catalogue.generatedAt ? new Date(catalogue.generatedAt) : new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/catalogue`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/discover`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/onboarding`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const perfumes: MetadataRoute.Sitemap = catalogue.perfumes.map((perfume) => ({
    url: `${baseUrl}/perfume/${perfume.id}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...pages, ...perfumes];
}
