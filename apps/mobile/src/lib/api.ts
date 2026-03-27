import { config } from "../constants/config";

export class NetworkError extends Error {
  readonly kind = "network" as const;
  constructor(cause?: unknown) {
    super("Network request failed");
    this.name = "NetworkError";
    if (cause instanceof Error) this.cause = cause;
  }
}

export class ApiError extends Error {
  readonly kind = "http" as const;
  readonly status: number;
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(response.status, errorBody);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "POST",
      body,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }),

  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PUT",
      body,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
};
