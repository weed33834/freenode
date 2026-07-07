import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const routes = [
    "",
    "/nodes",
    "/subscribe",
    "/subscribe/custom",
    "/sources",
    "/sources/guide",
    "/clients",
    "/tools",
    "/status",
    "/roadmap",
    "/changelog",
    "/architecture",
    "/about",
    "/community",
    "/contribute",
    "/disclaimer",
    "/news",
    "/platforms",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    // 首页和节点列表日更，其余周更
    changeFrequency: route === "" || route === "/nodes" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/nodes" ? 0.9 : 0.8,
  }));
}
