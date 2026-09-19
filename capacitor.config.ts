import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.manirampur.blood",
  appName: "Manirampur Blood Network",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://YOUR-DEPLOYED-DOMAIN",
    cleartext: false,
  },
};

export default config;
