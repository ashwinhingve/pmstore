import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME, SITE_SLOGAN } from "@/lib/constants";

// PWA manifest — installable-app metadata. Full legal name + "PM Store" short
// name; navy theme, paper background, capsule mark icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_SLOGAN,
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAF7",
    theme_color: "#16233A",
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
