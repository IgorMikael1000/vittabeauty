import { describe, expect, it } from "vitest";
import {
  escapeClientSearchPattern,
  normalizeClientName,
  normalizeClientWhatsapp,
} from "./client-normalization";

describe("client normalization", () => {
  it("normalizes whitespace and case in names", () => {
    expect(normalizeClientName("  ANA   Silva ")).toBe("ana silva");
  });

  it("removes formatting characters from WhatsApp numbers", () => {
    expect(normalizeClientWhatsapp("(11) 99999-1234")).toBe("11999991234");
  });

  it("escapes wildcard characters in client search prefixes", () => {
    expect(escapeClientSearchPattern("ana_%")).toBe("ana\\_\\%");
  });
});
