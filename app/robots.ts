import type { MetadataRoute } from "next";

// Area belajar dan admin tidak boleh terindeks (front-end-flow.md).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/dashboard", "/curriculum", "/learn", "/admin"],
      },
    ],
  };
}
