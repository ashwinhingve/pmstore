import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME, SITE_SLOGAN } from "@/lib/constants";

// PWA manifest — installable-app metadata. Full legal name + "PM Store" short
// name; white splash to match the logo, PM Store logo icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_SLOGAN,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#16233A",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
