import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/s/"],
        disallow: ["/dashboard/", "/admin/", "/profile/", "/groups/", "/api/"],
      },
    ],
    // Update this when you have a production domain
    // sitemap: "https://yourdomain.com/sitemap.xml",
  };
}
