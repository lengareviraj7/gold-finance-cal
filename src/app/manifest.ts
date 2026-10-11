import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Siddheshwar Jewelers - Gold Mortgage Calculator",
    short_name: "SJ Mortgage",
    description: "Gold mortgage interest calculator for Siddheshwar Jewelers",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#b48325",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
