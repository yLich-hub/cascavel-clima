import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { shouldRefresh } from "@/components/layout/AutoRefresh";
import { FreshnessBadge } from "@/components/weather/FreshnessBadge";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const TEN_MIN = 10 * 60_000;

describe("atualização automática", () => {
  it("só atualiza com a aba visível e depois do intervalo (igual ao cache do servidor)", () => {
    expect(shouldRefresh(0, TEN_MIN, true, TEN_MIN)).toBe(true);
    expect(shouldRefresh(0, TEN_MIN - 1, true, TEN_MIN)).toBe(false);
    expect(shouldRefresh(0, 5 * TEN_MIN, false, TEN_MIN)).toBe(false);
  });

  it("não desenha nada na tela", async () => {
    const { AutoRefresh } = await import("@/components/layout/AutoRefresh");
    expect(renderToStaticMarkup(<AutoRefresh everyMs={TEN_MIN} />)).toBe("");
  });

  it("selo de frescor mostra o horário do dado recebido do servidor", () => {
    const html = renderToStaticMarkup(
      <FreshnessBadge
        kind="forecast"
        prefix="Previsão obtida às"
        initial={{ status: "fresh", ageMinutes: 2, referenceTime: "2026-10-20T13:00:00Z" }}
      />,
    );
    expect(html).toContain("Previsão obtida às 10:00");
  });
});
