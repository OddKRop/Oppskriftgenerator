import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oppskriftgenerator",
    short_name: "Oppskrift",
    description: "Finn en tilfeldig oppskrift",
    start_url: "/",
    display: "standalone",
    // Følger --bg i globals.css. Står de fra hverandre, viser iOS en annen
    // farge enn appen i det den starter.
    background_color: "#161826",
    theme_color: "#161826",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
