import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BulletinNotice } from "@/components/enso/BulletinNotice";
import { SOURCES } from "@/content/el-nino";
import { REVIEWED_BULLETIN, compareBulletin } from "@/lib/enso/bulletin";
import { STATUS_TEXT } from "@/lib/enso/present";
import type { EnsoAlertStatus } from "@/types/enso";
import { planIssue } from "../scripts/check-enso-bulletin.mjs";

const base = { issuedOn: "2026-10-08", statuses: ["el-nino-advisory"] as EnsoAlertStatus[] };

describe("boletim usado nos textos (el-nino-bulletin.json)", () => {
  it("é o mesmo boletim citado como fonte na página", () => {
    expect(REVIEWED_BULLETIN.issuedOn).toBe(SOURCES["noaa-cpc"].publishedAt);
  });

  it("tem só situações conhecidas", () => {
    expect(REVIEWED_BULLETIN.statuses.length).toBeGreaterThan(0);
    for (const id of REVIEWED_BULLETIN.statuses) expect(STATUS_TEXT[id]).toBeDefined();
  });
});

describe("compareBulletin", () => {
  it("mesmo boletim ou mais antigo: nada", () => {
    expect(compareBulletin(base, base)).toEqual({ kind: "none" });
    expect(compareBulletin({ ...base, issuedOn: "2026-09-10" }, base)).toEqual({ kind: "none" });
  });

  it("boletim novo com a mesma situação", () => {
    expect(compareBulletin({ ...base, issuedOn: "2026-11-12" }, base)).toEqual({
      kind: "new-bulletin",
      issuedOn: "2026-11-12",
      reviewedOn: "2026-10-08",
      statuses: ["El Niño em curso"],
    });
  });

  it("situação mudou (inclusive para duas situações ao mesmo tempo)", () => {
    const live = { issuedOn: "2027-05-13", statuses: ["final-el-nino-advisory", "la-nina-watch"] as EnsoAlertStatus[] };
    expect(compareBulletin(live, base)).toEqual({
      kind: "status-changed",
      issuedOn: "2027-05-13",
      reviewedOn: "2026-10-08",
      from: ["El Niño em curso"],
      to: ["Fim do El Niño", "Vigilância de La Niña"],
    });
  });

  it("a ordem das situações não importa", () => {
    const a = ["la-nina-watch", "final-el-nino-advisory"] as EnsoAlertStatus[];
    const b = ["final-el-nino-advisory", "la-nina-watch"] as EnsoAlertStatus[];
    expect(compareBulletin({ issuedOn: "2027-06-10", statuses: a }, { issuedOn: "2027-05-13", statuses: b }).kind).toBe(
      "new-bulletin",
    );
  });
});

describe("BulletinNotice", () => {
  it("sem mudança, não mostra nada", () => {
    expect(renderToStaticMarkup(<BulletinNotice change={{ kind: "none" }} />)).toBe("");
  });

  it("mudança de situação: destaca de qual para qual, com a data", () => {
    const html = renderToStaticMarkup(
      <BulletinNotice
        change={{ kind: "status-changed", issuedOn: "2027-05-13", reviewedOn: "2026-10-08", from: ["El Niño em curso"], to: ["Fim do El Niño"] }}
      />,
    );
    expect(html).toContain("A situação oficial do El Niño mudou.");
    expect(html).toContain("passou de “El Niño em curso” para “Fim do El Niño”");
    expect(html).toContain("13/05/2027");
    expect(html).toContain("boletim de 08/10/2026");
    expect(html).toContain('role="status"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("boletim novo sem mudança: informa que a situação continua", () => {
    const html = renderToStaticMarkup(
      <BulletinNotice change={{ kind: "new-bulletin", issuedOn: "2026-11-12", reviewedOn: "2026-10-08", statuses: ["El Niño em curso"] }} />,
    );
    expect(html).toContain("Saiu um novo boletim do NOAA");
    expect(html).toContain("continua “El Niño em curso”");
  });
});

describe("planIssue (workflow enso-boletim.yml)", () => {
  it("sem mudança ou sem dados: não abre issue", () => {
    expect(planIssue(null)).toBeNull();
    expect(planIssue({ change: { kind: "none" } })).toBeNull();
  });

  it("um título por boletim (evita issue repetida) e checklist de revisão", () => {
    const plan = planIssue({
      change: { kind: "status-changed", issuedOn: "2027-05-13", reviewedOn: "2026-10-08", from: ["El Niño em curso"], to: ["Fim do El Niño"] },
    });
    expect(plan?.title).toBe("Novo boletim do NOAA de 13/05/2027: revisar a página El Niño");
    expect(plan?.body).toContain("**A situação oficial mudou:** de “El Niño em curso” para “Fim do El Niño”.");
    expect(plan?.body).toContain("src/content/el-nino-bulletin.json");
    expect(plan?.body).toContain("`2027-05-13`");
  });

  it("boletim novo sem mudança também pede revisão dos textos", () => {
    const plan = planIssue({
      change: { kind: "new-bulletin", issuedOn: "2026-11-12", reviewedOn: "2026-10-08", statuses: ["El Niño em curso"] },
    });
    expect(plan?.body).toContain("A situação oficial continua “El Niño em curso”.");
  });
});
