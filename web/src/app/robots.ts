import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/verify-email/"],
    },
    sitemap: "https://botsbuilderkids.com/sitemap.xml",
    host: "https://botsbuilderkids.com",
  };
}
