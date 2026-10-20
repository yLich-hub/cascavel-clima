import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import OfflinePage from "@/app/offline/page";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import { CLOUD_TONES, SUN_PEAK } from "@/lib/weather/scene-palette";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
const { MobileNav, HeaderLinks } = await import("@/components/layout/MobileNav");

const root = process.cwd();

/** Largura e altura lidas do cabeçalho do PNG. */
function pngSize(path: string) {
  const data = readFileSync(join(root, path));
  expect(data.subarray(1, 4).toString()).toBe("PNG");
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

describe("manifesto do app", () => {
  const m = manifest();

  it("tem o mínimo para instalação: nome, início, tela cheia e ícones 192 e 512", () => {
    expect(m.name).toBe("Clima Cascavel – PR");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    const sizes = m.icons?.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(m.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("cada ícone existe em public/ com o tamanho declarado", () => {
    for (const icon of m.icons ?? []) {
      expect(pngSize(join("public", icon.src))).toBe(icon.sizes);
    }
    expect(pngSize("src/app/apple-icon.png")).toBe("180x180");
  });

  it("favicon é um ICO válido com PNG embutido (não o ícone padrão do Next)", () => {
    const ico = readFileSync(join(root, "src/app/favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.subarray(23, 26).toString()).toBe("PNG");
  });

  it("cores do tema iguais ao fundo do site", () => {
    expect(m.theme_color).toBe("#0f172a");
    expect(m.background_color).toBe("#0f172a");
  });
});

describe("service worker (public/sw.js)", () => {
  type Handler = (event: unknown) => void;

  function loadWorker({ online }: { online: boolean }) {
    const handlers: Record<string, Handler> = {};
    const store = new Map<string, Response>();
    const cache = {
      add: async (request: Request) => void store.set(new URL(request.url, "https://site.test").pathname, new Response("offline")),
      match: async (request: Request | string) =>
        store.get(typeof request === "string" ? request : new URL(request.url).pathname),
      put: async (request: Request, response: Response) => void store.set(new URL(request.url).pathname, response),
      keys: async () => [...store.keys()].map((path) => new Request(`https://site.test${path}`)),
      delete: async (request: Request) => store.delete(new URL(request.url).pathname),
    };
    const fetched: string[] = [];
    const context = {
      self: {
        location: { origin: "https://site.test" },
        addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
      caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: cache.match },
      fetch: async (request: Request) => {
        fetched.push(new URL(request.url).pathname);
        if (!online) throw new TypeError("Failed to fetch");
        return new Response("rede");
      },
      // No navegador, Request aceita caminho relativo (resolve pela origem do site).
      Request: class extends Request {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
          super(typeof input === "string" ? new URL(input, "https://site.test") : input, init);
        }
      },
      Response,
      URL,
    };
    runInNewContext(readFileSync(join(root, "public/sw.js"), "utf8"), context);

    async function dispatch(type: string, request?: Request) {
      let response: Promise<Response> | undefined;
      const waits: Promise<unknown>[] = [];
      handlers[type]({
        request,
        respondWith: (value: Promise<Response>) => (response = value),
        waitUntil: (value: Promise<unknown>) => waits.push(value),
      });
      await Promise.all(waits);
      return response;
    }
    return { dispatch, store, fetched };
  }

  const navigate = (path: string) => {
    const request = new Request(`https://site.test${path}`);
    Object.defineProperty(request, "mode", { value: "navigate" });
    return request;
  };

  it("guarda a página /offline ao instalar", async () => {
    const worker = loadWorker({ online: true });
    await worker.dispatch("install");
    expect([...worker.store.keys()]).toEqual(["/offline"]);
  });

  it("com internet, páginas vêm da rede", async () => {
    const worker = loadWorker({ online: true });
    await worker.dispatch("install");
    expect(await (await worker.dispatch("fetch", navigate("/")))?.text()).toBe("rede");
  });

  it("sem internet, qualquer página mostra /offline", async () => {
    const worker = loadWorker({ online: false });
    await worker.dispatch("install");
    expect(await (await worker.dispatch("fetch", navigate("/el-nino")))?.text()).toBe("offline");
  });

  it("nunca intercepta nem guarda dados do tempo ou do El Niño", async () => {
    const worker = loadWorker({ online: true });
    for (const path of ["/api/weather", "/api/enso"]) {
      expect(await worker.dispatch("fetch", new Request(`https://site.test${path}`))).toBeUndefined();
    }
    expect([...worker.store.keys()].some((key) => key.startsWith("/api"))).toBe(false);
  });

  it("arquivos estáticos do site ficam guardados para a página offline ter o visual", async () => {
    const worker = loadWorker({ online: true });
    await worker.dispatch("fetch", new Request("https://site.test/_next/static/chunks/a.css"));
    expect(worker.store.has("/_next/static/chunks/a.css")).toBe(true);
  });
});

describe("página sem conexão", () => {
  const html = renderToStaticMarkup(<OfflinePage />);

  it("explica por que não mostra dados antigos e oferece tentar de novo", () => {
    expect(html).toContain("Sem conexão com a internet");
    expect(html).toContain("não guarda previsões no aparelho");
    expect(html).toContain('href="/"');
  });

  it("título em negrito e texto branco mesmo sem o CSS", () => {
    expect(html).toMatch(/<h1 class="[^"]*font-bold/);
    expect(html).toContain("color:#fff");
  });
});

/** Links marcados como página atual. */
const activeHrefs = (html: string) =>
  (html.match(/<a [^>]*>/g) ?? [])
    .filter((tag) => tag.includes('aria-current="page"'))
    .map((tag) => /href="([^"]*)"/.exec(tag)?.[1]);

describe("menu inferior do celular", () => {
  const render = (path: string) => {
    pathname.value = path;
    return renderToStaticMarkup(<MobileNav />);
  };

  it("três destinos, só no celular, e marca a página atual", () => {
    const html = render("/el-nino");
    expect(html).toContain("sm:hidden");
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(activeHrefs(html)).toEqual(["/el-nino"]);
  });

  it("a Início só fica marcada na própria Início", () => {
    expect(activeHrefs(render("/"))).toEqual(["/"]);
    expect(activeHrefs(render("/sobre"))).toEqual(["/sobre"]);
  });

  it("alvos de toque de 56 px", () => {
    expect(render("/")).toContain("h-14");
  });

  it("cabeçalho: links escondidos no celular e página atual marcada", () => {
    pathname.value = "/sobre";
    const html = renderToStaticMarkup(<HeaderLinks />);
    expect(html).toContain("hidden");
    expect(activeHrefs(html)).toEqual(["/sobre"]);
  });

  it("fundo do menu: texto branco ≥ 4,5:1 até sobre o centro do sol e nuvem branca", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
    const block = css.slice(css.indexOf(".site-tabbar {"), css.indexOf("}", css.indexOf(".site-tabbar {")));
    const alpha = Number(/background: rgb\(2 6 23 \/ ([\d.]+)\)/.exec(block)?.[1]);
    expect(alpha).toBeGreaterThan(0);
    const white: RGB = [255, 255, 255];
    for (const point of [SUN_PEAK, CLOUD_TONES.white.light, white]) {
      const background = blend([2, 6, 23], alpha, point);
      expect(contrastRatio(blend(white, 0.9, background), background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
