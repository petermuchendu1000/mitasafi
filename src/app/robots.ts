import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/dashboard/"] },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
