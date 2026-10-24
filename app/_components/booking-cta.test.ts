import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BookingCTA from "./booking-cta";

const render = (props: { dayLabel?: string; time?: string; loading: boolean }) =>
  renderToStaticMarkup(createElement(BookingCTA, { ...props, onClick: () => undefined }));

describe("BookingCTA (Prompt 21)", () => {
  it("carregando: aria-busy, desabilitado e \"Reservando…\" com o spinner só em motion-safe", () => {
    const html = render({ dayLabel: "Sex 16", time: "13:30", loading: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("Reservando…");
    expect(html).toContain("motion-safe:animate-spin");
    expect(html).not.toMatch(/(^|[\s"])animate-spin/);
  });

  it("pronto: aria-busy false e o texto do horário", () => {
    const html = render({ dayLabel: "Sex 16", time: "13:30", loading: false });
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("Reservar Sex 16 às 13:30");
    expect(html).not.toContain("Reservando…");
  });
});
