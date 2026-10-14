import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ElNinoPage from "@/app/el-nino/page";
import { EL_NINO, SOURCES, isReviewOverdue } from "@/content/el-nino";
import { formatDate } from "@/lib/format";

const allStatements = [
  ...EL_NINO.whatIs,
  ...EL_NINO.status.statements,
  ...EL_NINO.south,
  ...EL_NINO.parana,
  ...EL_NINO.caveats,
];

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

describe("conteúdo do El Niño", () => {
  it("toda afirmação aponta para uma fonte cadastrada", () => {
    for (const statement of allStatements) {
      expect(SOURCES[statement.source], statement.text).toBeDefined();
    }
  });

  it("fontes usam HTTPS e datas válidas, nunca posteriores à revisão", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.url.startsWith("https://")).toBe(true);
      if (source.publishedAt !== null) {
        expect(isIsoDate(source.publishedAt)).toBe(true);
        expect(source.publishedAt <= EL_NINO.reviewedAt).toBe(true);
      }
    }
  });

  it("datas de revisão e próximo boletim são coerentes", () => {
    expect(isIsoDate(EL_NINO.reviewedAt)).toBe(true);
    expect(isIsoDate(EL_NINO.nextExpectedUpdate)).toBe(true);
    expect(EL_NINO.nextExpectedUpdate > EL_NINO.reviewedAt).toBe(true);
  });

  it("a página avisa que um dia específico não pode ser atribuído ao El Niño", () => {
    const html = renderToStaticMarkup(<ElNinoPage />);
    expect(html).toContain("não pode ser atribuído ao El Niño");
  });
});

describe("isReviewOverdue", () => {
  it("não avisa no dia da revisão nem no dia do próximo boletim", () => {
    expect(isReviewOverdue("2026-10-14")).toBe(false);
    expect(isReviewOverdue("2026-11-12")).toBe(false);
  });

  it("avisa depois da data prevista do próximo boletim", () => {
    expect(isReviewOverdue("2026-11-13")).toBe(true);
  });

  it("avisa quando passa do prazo máximo, mesmo sem boletim previsto", () => {
    const content = { ...EL_NINO, nextExpectedUpdate: "2099-01-01" };
    expect(isReviewOverdue("2026-11-28", content)).toBe(false); // 45 dias
    expect(isReviewOverdue("2026-11-29", content)).toBe(true); // 46 dias
  });
});

describe("página El Niño", () => {
  const html = renderToStaticMarkup(<ElNinoPage />);

  it("deixa claro que não é previsão do tempo", () => {
    expect(html).toContain("não é previsão do tempo");
  });

  it("cita a fonte em cada afirmação", () => {
    const citations = html.match(/\(Fonte:/g) ?? [];
    expect(citations).toHaveLength(allStatements.length);
  });

  it("lista todas as fontes com links seguros", () => {
    for (const source of Object.values(SOURCES)) {
      expect(html).toContain(`href="${source.url}"`);
    }
    for (const tag of html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? []) {
      expect(tag).toContain('rel="noopener noreferrer"');
    }
  });

  it("mostra datas de publicação, revisão e próximo boletim", () => {
    expect(html).toContain("08/10/2026");
    expect(html).toContain("conferido nas fontes em 14/10/2026");
    expect(html).toContain("previsto para 12/11/2026");
  });
});

describe("formatDate", () => {
  it("formata data sem depender de fuso", () => {
    expect(formatDate("2026-10-08")).toBe("08/10/2026");
    expect(formatDate("2027-01-01")).toBe("01/01/2027");
  });
});
