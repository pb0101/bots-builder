import type { MetadataRoute } from "next";

const BASE = "https://botsbuilderkids.com";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: { path: string; priority: number; freq: "weekly" | "monthly" }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/programs/", priority: 0.9, freq: "monthly" },
    { path: "/schedule/", priority: 0.9, freq: "weekly" },
    { path: "/pricing/", priority: 0.8, freq: "monthly" },
    { path: "/about/", priority: 0.6, freq: "monthly" },
    { path: "/faq/", priority: 0.6, freq: "monthly" },
    { path: "/contact/", priority: 0.5, freq: "monthly" },
    { path: "/signup/", priority: 0.4, freq: "monthly" },
    { path: "/signin/", priority: 0.3, freq: "monthly" },
    { path: "/terms/", priority: 0.2, freq: "monthly" },
    { path: "/privacy/", priority: 0.2, freq: "monthly" },
    { path: "/refunds/", priority: 0.2, freq: "monthly" },
  ];
  return paths.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
