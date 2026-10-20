import "server-only";
import { getCache } from "@vercel/functions";

/**
 * Onde guardar o "último dado bom" de uma fonte, para usar quando o provedor falhar.
 *
 * Na Vercel, a memória de uma instância é descartável: por isso o dado vai para
 * o Runtime Cache, compartilhado entre instâncias. Fora da Vercel (dev e testes)
 * o `getCache` cai automaticamente para memória local.
 */
export type LastGoodStore<T> = {
  get(): Promise<T | null>;
  set(value: T): Promise<void>;
};

// No plano Hobby todos os projetos da conta dividem o mesmo Runtime Cache.
const NAMESPACE = "cascavel-clima";

type RuntimeCacheOptions<T> = {
  /** Chave com versão do formato: ao mudar o formato, mude a chave. */
  key: string;
  ttlSeconds: number;
  /** Checagem estrutural: o dado vem de fora do processo e pode estar num formato antigo. */
  isValid: (value: unknown) => value is T;
};

export function runtimeCacheStore<T>({ key, ttlSeconds, isValid }: RuntimeCacheOptions<T>): LastGoodStore<T> {
  // getCache só é chamado no uso, não ao importar o módulo.
  const cache = () => getCache({ namespace: NAMESPACE });
  return {
    async get() {
      const value = await cache().get(key);
      return isValid(value) ? value : null;
    },
    async set(value) {
      await cache().set(key, value, { ttl: ttlSeconds, name: "ultimo-dado-bom" });
    },
  };
}

/** Para testes: guarda em memória, como uma instância de servidor isolada. */
export function memoryStore<T>(initial: T | null = null): LastGoodStore<T> {
  let value = initial;
  return {
    async get() {
      return value;
    },
    async set(next) {
      value = next;
    },
  };
}
