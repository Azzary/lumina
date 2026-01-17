type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpClientConfig = {
  baseUrl: string;
};

export function createHttpClient(config: HttpClientConfig) {
  if (!config.baseUrl) {
    throw new Error("HttpClientConfig.baseUrl is required");
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let extra = "";
      try {
        const data = await res.json();
        extra = ` | ${JSON.stringify(data)}`;
      } catch {
      }
      throw new Error(`HTTP ${res.status} ${method} ${path}${extra}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
  };
}
