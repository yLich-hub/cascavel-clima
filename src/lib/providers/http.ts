import { PROVIDER_TIMEOUT_MS } from "@/lib/config";

/**
 * Peças comuns aos clientes de provedores externos (Open-Meteo, NOAA CPC):
 * o tipo de erro e a requisição com tempo limite.
 */

export type ProviderErrorKind = "timeout" | "network" | "http" | "invalid-response";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }

  /** Vale tentar de novo? Erros 4xx (exceto 429) e resposta inválida não. */
  get retryable(): boolean {
    if (this.kind === "timeout" || this.kind === "network") return true;
    if (this.kind === "http") return this.status === 429 || (this.status ?? 0) >= 500;
    return false;
  }
}

export type FetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * GET com tempo limite. Falha de rede, timeout e HTTP fora de 2xx viram
 * `ProviderError`. O tempo limite vale também para a leitura do corpo.
 */
export async function request(
  url: string,
  { fetchImpl = fetch, timeoutMs = PROVIDER_TIMEOUT_MS, accept }: FetchOptions & { accept: string },
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw toRequestError(error, timeoutMs);
  }

  if (!response.ok) {
    throw new ProviderError("http", `HTTP ${response.status}`, response.status);
  }
  return response;
}

/** Lê o corpo como texto, com os mesmos erros de `request`. */
export async function requestText(url: string, options: FetchOptions & { accept: string }): Promise<string> {
  const response = await request(url, options);
  try {
    return await response.text();
  } catch (error) {
    throw toRequestError(error, options.timeoutMs ?? PROVIDER_TIMEOUT_MS);
  }
}

function toRequestError(error: unknown, timeoutMs: number): ProviderError {
  if (error instanceof Error && error.name === "TimeoutError") {
    return new ProviderError("timeout", `sem resposta em ${timeoutMs} ms`);
  }
  return new ProviderError("network", error instanceof Error ? error.message : String(error));
}
