// QA visual automático: abre o site num Chrome/Edge sem janela, rola cada página
// como um usuário (computador 1440×900 e celular 390×844), tira capturas e confere:
// - erros de console, exceções e requisições que falharam;
// - rolagem lateral em cada posição de rolagem;
// - fonte Geist carregada, um único <h1> e lang="pt-BR";
// - alvos de toque de pelo menos 44 px no celular (botões, pílulas, abas);
// - história do El Niño: passos 1 → 4 na ordem e manifesto todo aceso no fim;
//   com "reduzir movimento", os 4 passos visíveis e a frase acesa sem rolar;
// - redimensionamento: aberta em 750 px e alargada para 1600 px, a página fica
//   igual à aberta direto em 1600 px.
// Inspirado no qa.mjs da skill one-shot, sem dependências: fala direto com o
// navegador pelo protocolo de depuração (CDP).
//
// Uso:  npm run build && npm start   (em outro terminal)
//       node scripts/qa-visual.mjs [url-base] [--out pasta] [--sem-capturas]
// Sai com código 1 se houver problema (usado no CI).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const PAGES = ["/", "/el-nino", "/sobre"];
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false, stops: 6 },
  mobile: { width: 390, height: 844, mobile: true, stops: 5 },
};
export const MIN_TOUCH_PX = 44;

/**
 * Avalia o relatório. Função pura (testada em tests/qa-visual.test.ts).
 * @param {any} report
 * @returns {{ problems: string[], warnings: string[] }}
 */
export function evaluateQa(report) {
  const problems = [];
  const warnings = [];

  for (const run of report.runs ?? []) {
    const where = `${run.path} (${run.viewport}${run.reducedMotion ? ", movimento reduzido" : ""})`;
    for (const error of run.errors ?? []) problems.push(`${where}: ${error}`);
    if (run.overflow?.length) {
      problems.push(`${where}: rolagem lateral em y=${run.overflow.map((o) => o.y).join(", ")} (${run.overflow[0].scrollWidth}px)`);
    }
    if (run.h1 !== 1) problems.push(`${where}: ${run.h1} elementos <h1> (esperado 1)`);
    if (run.lang !== "pt-BR") problems.push(`${where}: lang="${run.lang}" (esperado pt-BR)`);
    if (!run.fontLoaded) problems.push(`${where}: fonte Geist não carregou`);
    for (const target of run.smallTargets ?? []) {
      problems.push(`${where}: alvo de toque pequeno (${target.height}px): ${target.label}`);
    }
    if (run.story) {
      const { steps, manifestoLit, manifestoTotal } = run.story;
      if (run.reducedMotion) {
        if (!steps.every((step) => step === "todos")) problems.push(`${where}: passos da história não estão todos visíveis`);
      } else if (steps.join(",") !== "0,1,2,3") {
        problems.push(`${where}: história mostrou os passos ${steps.join(",")} (esperado 0,1,2,3)`);
      }
      if (manifestoTotal > 0 && manifestoLit < manifestoTotal) {
        problems.push(`${where}: manifesto com ${manifestoLit}/${manifestoTotal} palavras acesas no fim`);
      }
    }
  }

  for (const check of report.resize ?? []) {
    if (check.mainAfterResize !== check.mainFresh || check.overflowAfterResize > 0) {
      problems.push(
        `${check.path}: depois de alargar de 750 para 1600 px, conteúdo com ${check.mainAfterResize}px (aberta direto: ${check.mainFresh}px)` +
          (check.overflowAfterResize > 0 ? ` e rolagem lateral de ${check.overflowAfterResize}px` : ""),
      );
    }
  }

  if ((report.runs ?? []).length === 0) problems.push("nenhuma página foi verificada");
  for (const run of report.runs ?? []) {
    if (run.screenshots === 0 && !report.noShots) warnings.push(`${run.path} (${run.viewport}): nenhuma captura`);
  }
  return { problems, warnings };
}

// --- Navegador --------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function launchBrowser() {
  const executable = findBrowser();
  if (!executable) throw new Error("Chrome/Edge não encontrado. Defina CHROME_PATH.");
  const profile = mkdtempSync(path.join(os.tmpdir(), "qa-visual-"));
  const args = [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    ...(process.platform === "linux" ? ["--no-sandbox"] : []),
    "about:blank",
  ];
  const child = spawn(executable, args, { stdio: "ignore" });
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) throw new Error("o navegador não abriu a porta de depuração");
  const port = readFileSync(portFile, "utf8").split("\n")[0].trim();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === "page");
  const session = await connect(page.webSocketDebuggerUrl);
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const close = async () => {
    // Fecha pelo próprio navegador: no Windows, matar só o processo principal deixava
    // os processos filhos (renderização, GPU) abertos depois do QA.
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const browser = await connect(webSocketDebuggerUrl);
      browser.send("Browser.close").catch(() => {});
      await Promise.race([exited, sleep(5000)]);
      browser.close();
    } catch {
      // sem resposta: cai para o encerramento forçado abaixo
    }
    session.close();
    if (child.exitCode === null) {
      if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGKILL");
      await Promise.race([exited, sleep(3000)]);
    }
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // perfil temporário: se o sistema ainda segurar algum arquivo, fica para a limpeza do SO
    }
  };
  return { session, close, executable };
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) listener(message.params);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "erro ao avaliar");
    return result.result.value;
  };
  return { send, on, evaluate, close: () => ws.close() };
}

// --- Execução ---------------------------------------------------------------------

/** Rola em passos, como um usuário, para as animações ligadas à rolagem acompanharem. */
const scrollTo = (session, y) =>
  session.evaluate(`(async () => {
    const to = ${Math.round(y)}, from = scrollY;
    for (let k = 1; k <= 12; k++) { scrollTo(0, from + (to - from) * k / 12); await new Promise(r => requestAnimationFrame(r)); }
    await new Promise(r => setTimeout(r, 650));
  })()`);

async function open(session, url, viewport, reducedMotion) {
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }],
  });
  await session.send("Page.navigate", { url });
  // Espera o carregamento e o conteúdo que chega depois (dados ao vivo em Suspense).
  await session.evaluate(`new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }))`);
  await sleep(2500);
  await session.evaluate("document.fonts.ready.then(() => true)");
}

async function checkPage(session, base, pagePath, viewportName, { reducedMotion = false, out, noShots }) {
  const viewport = VIEWPORTS[viewportName];
  const errors = [];
  // Os ouvintes do navegador (main) mandam os erros para a verificação em andamento.
  session.current = { record: (text) => errors.push(text.slice(0, 240)) };

  await open(session, base + pagePath, viewport, reducedMotion);

  const info = await session.evaluate(`({
    h1: document.querySelectorAll("h1").length,
    lang: document.documentElement.lang,
    fontLoaded: [...document.fonts].some(f => /geist/i.test(f.family) && f.status === "loaded"),
    height: document.documentElement.scrollHeight,
    hasStory: !!document.querySelector(".el-nino-story"),
  })`);

  const overflow = [];
  let screenshots = 0;
  const maxY = Math.max(0, info.height - viewport.height);
  const stops = reducedMotion ? 1 : viewport.stops;
  for (let i = 0; i < stops; i++) {
    const y = Math.round((maxY * i) / Math.max(1, stops - 1));
    await scrollTo(session, y);
    const state = await session.evaluate(`({ y: Math.round(scrollY), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`);
    if (state.scrollWidth > state.clientWidth + 1) overflow.push({ y: state.y, scrollWidth: state.scrollWidth });
    if (!noShots) {
      const shot = await session.send("Page.captureScreenshot", { format: "png" });
      const slug = pagePath === "/" ? "inicio" : pagePath.replace(/\W+/g, "-").replace(/^-|-$/g, "");
      writeFileSync(path.join(out, `${slug}-${viewportName}${reducedMotion ? "-calmo" : ""}-${String(i).padStart(2, "0")}.png`), Buffer.from(shot.data, "base64"));
      screenshots++;
    }
  }

  // Alvos de toque: só no celular, só o que está visível e é botão/pílula/aba/menu.
  const smallTargets = viewport.mobile
    ? await session.evaluate(`[...document.querySelectorAll(".pill, button, [role=tab], nav a")]
        .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" && !el.closest("[aria-hidden=true]"); })
        .filter(el => !el.closest("header"))
        .map(el => ({ height: Math.round(el.getBoundingClientRect().height), label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 60) }))
        .filter(t => t.height < ${MIN_TOUCH_PX})`)
    : [];

  const story = info.hasStory ? await checkStory(session, reducedMotion) : null;
  session.current = null;
  return {
    path: pagePath,
    viewport: viewportName,
    reducedMotion,
    h1: info.h1,
    lang: info.lang,
    fontLoaded: info.fontLoaded,
    overflow,
    smallTargets,
    story,
    screenshots,
    errors: [...new Set(errors)],
  };
}

async function checkStory(session, reducedMotion) {
  const stepsSeen = [];
  if (reducedMotion) {
    const allVisible = await session.evaluate(`[...document.querySelectorAll(".story-step")].every(s => Number(getComputedStyle(s).opacity) > 0.95)`);
    stepsSeen.push(allVisible ? "todos" : "faltando");
  } else {
    const geo = await session.evaluate(`(() => { const s = document.querySelector(".el-nino-story"); return { top: s.getBoundingClientRect().top + scrollY, height: s.offsetHeight, vh: innerHeight }; })()`);
    for (const fraction of [0.08, 0.38, 0.66, 0.95]) {
      await scrollTo(session, geo.top + (geo.height - geo.vh) * fraction);
      stepsSeen.push(await session.evaluate(`[...document.querySelectorAll(".story-step")].findIndex(s => Number(getComputedStyle(s).opacity) > 0.9)`));
    }
  }
  const manifesto = await session.evaluate(`(async () => {
    const m = document.querySelector(".manifesto");
    if (!m) return { lit: 0, total: 0 };
    scrollTo(0, m.getBoundingClientRect().top + scrollY - innerHeight * 0.1);
    await new Promise(r => setTimeout(r, 700));
    const words = [...document.querySelectorAll(".manifesto-word")];
    const lit = words.filter(w => { const s = getComputedStyle(w); return s.backgroundPositionX === "0%" || s.color !== "rgba(0, 0, 0, 0)"; }).length;
    return { lit, total: words.length };
  })()`);
  return { steps: stepsSeen, manifestoLit: manifesto.lit, manifestoTotal: manifesto.total };
}

async function checkResize(session, base, pagePath) {
  const width = `document.querySelector("main")?.getBoundingClientRect().width ?? 0`;
  await open(session, base + pagePath, { width: 1600, height: 900, mobile: false }, false);
  const mainFresh = Math.round(await session.evaluate(width));
  await open(session, base + pagePath, { width: 750, height: 900, mobile: false }, false);
  await session.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  const after = await session.evaluate(`({ main: Math.round(${width}), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })`);
  return { path: pagePath, mainFresh, mainAfterResize: after.main, overflowAfterResize: Math.max(0, after.overflow) };
}

async function main() {
  const args = process.argv.slice(2);
  const base = (args.find((a) => !a.startsWith("--")) ?? process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const outIndex = args.indexOf("--out");
  const out = path.resolve(outIndex >= 0 ? args[outIndex + 1] : "qa-out");
  const noShots = args.includes("--sem-capturas");
  mkdirSync(out, { recursive: true });

  const { session, close, executable } = await launchBrowser();
  // Erros de qualquer página aberta vão para a verificação em andamento.
  const report = (text) => session.current?.record(text);
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Log.enable");
  await session.send("Network.enable");
  session.on("Runtime.exceptionThrown", (p) => report(`exceção: ${p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text}`));
  session.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") report(`console: ${p.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
  });
  session.on("Log.entryAdded", (p) => {
    if (p.entry.level === "error" && p.entry.source !== "network") report(`log: ${p.entry.text}`);
  });
  session.on("Network.loadingFailed", (p) => {
    if (!p.canceled && !/ERR_ABORTED/.test(p.errorText)) report(`rede: ${p.errorText} (${p.type})`);
  });
  session.on("Network.responseReceived", (p) => {
    if (p.response.status >= 400) report(`HTTP ${p.response.status}: ${p.response.url.slice(0, 120)}`);
  });

  const result = { base, date: new Date().toISOString(), browser: executable, noShots, runs: [], resize: [] };
  try {
    for (const pagePath of PAGES) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        result.runs.push(await checkPage(session, base, pagePath, viewportName, { out, noShots }));
      }
    }
    // A história é a única parte que muda com "reduzir movimento": confere a versão calma também.
    result.runs.push(await checkPage(session, base, "/el-nino", "mobile", { reducedMotion: true, out, noShots }));
    for (const pagePath of PAGES) result.resize.push(await checkResize(session, base, pagePath));
  } finally {
    await close();
  }

  writeFileSync(path.join(out, "relatorio.json"), JSON.stringify(result, null, 2));
  const { problems, warnings } = evaluateQa(result);
  for (const run of result.runs) {
    const flags = [
      run.errors.length ? `${run.errors.length} erro(s)` : "sem erros",
      run.overflow.length ? "ROLAGEM LATERAL" : "sem rolagem lateral",
      run.story ? `história ${run.story.steps.join(",")}, manifesto ${run.story.manifestoLit}/${run.story.manifestoTotal}` : null,
    ].filter(Boolean);
    console.log(`${run.path.padEnd(9)} ${run.viewport.padEnd(7)}${run.reducedMotion ? " calmo" : "      "}  ${flags.join(" · ")}`);
  }
  for (const check of result.resize) console.log(`${check.path.padEnd(9)} 750→1600 px: ${check.mainAfterResize}px (direto: ${check.mainFresh}px)`);
  for (const warning of warnings) console.log(`AVISO: ${warning}`);
  if (problems.length) {
    for (const problem of problems) console.error(`PROBLEMA: ${problem}`);
    console.error(`\nRelatório e capturas: ${out}`);
    process.exit(1);
  }
  console.log(`\nOK: QA visual sem problemas. Relatório e capturas: ${out}`);
}

if (process.argv[1]?.endsWith("qa-visual.mjs")) {
  await main();
}
