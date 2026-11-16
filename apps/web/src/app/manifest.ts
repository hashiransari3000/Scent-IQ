import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScentIQ — Fragrance recommendations",
    short_name: "ScentIQ",
    description:
      "Personalised fragrance recommendations from notes, scent families and your own taste — with a reason behind every match.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F5F0E6",
    theme_color: "#0E0D0B",
    categories: ["lifestyle", "shopping", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Your matches",
        short_name: "For you",
        description: "Open your personalised shortlist",
        url: "/discover",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Catalogue",
        short_name: "Catalogue",
        description: "Browse all perfumes",
        url: "/catalogue",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
