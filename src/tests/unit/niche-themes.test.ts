import { describe, it, expect } from "vitest";
import { getNicheThemeClass } from "@/lib/themes/niche-themes";

describe("getNicheThemeClass", () => {
  it("retorna string vazia para nicho nulo", () => {
    expect(getNicheThemeClass(null)).toBe("");
    expect(getNicheThemeClass(undefined)).toBe("");
  });

  it("retorna string vazia para nicho desconhecido", () => {
    expect(getNicheThemeClass("saude")).toBe("");
    expect(getNicheThemeClass("imobiliario")).toBe("");
  });

  it("retorna theme-auto-parts para auto-parts e sub-nichos", () => {
    expect(getNicheThemeClass("auto-parts")).toBe("theme-auto-parts");
    expect(getNicheThemeClass("auto-parts-heavy")).toBe("theme-auto-parts");
    expect(getNicheThemeClass("auto-parts-light")).toBe("theme-auto-parts");
    expect(getNicheThemeClass("auto-parts-agro")).toBe("theme-auto-parts");
    expect(getNicheThemeClass("auto-parts-moto")).toBe("theme-auto-parts");
  });

  it("retorna theme-fashion para moda e sub-nichos", () => {
    expect(getNicheThemeClass("moda")).toBe("theme-fashion");
    expect(getNicheThemeClass("moda-feminina")).toBe("theme-fashion");
    expect(getNicheThemeClass("moda-masculina")).toBe("theme-fashion");
    expect(getNicheThemeClass("moda-infantil")).toBe("theme-fashion");
    expect(getNicheThemeClass("moda-evangelica")).toBe("theme-fashion");
    expect(getNicheThemeClass("calcados")).toBe("theme-fashion");
  });

  it("retorna string vazia para auto-sales (sem tema diferenciado ainda)", () => {
    // auto-sales não tem entrada no mapa — usa tema padrão
    expect(getNicheThemeClass("auto-sales")).toBe("");
  });
});
