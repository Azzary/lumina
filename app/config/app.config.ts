function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const AppConfig = {
  servers: {
    metadata: {
      baseUrl: "/metadata",
    },
    download: {
      baseUrl: "/download",
      streamBaseUrl: trimTrailingSlash(
        process.env.NEXT_PUBLIC_DOWNLOAD_STREAM_BASE_URL ?? ""
      ),
    },
  },
} as const;
