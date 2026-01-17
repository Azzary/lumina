import { AppConfig } from "@/app/config/app.config";
import { createHttpClient } from "./http";

export const metadataHttp = createHttpClient({
  baseUrl: `${AppConfig.servers.metadata.baseUrl}/api`,
});

export const downloadHttp = createHttpClient({
  baseUrl: `${AppConfig.servers.download.baseUrl}/api`,
});
