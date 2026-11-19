import { describe, expect, it } from "vitest";
import { formatLastViewed } from "./relative-time";

describe("formatLastViewed", () => {
  it("hari yang sama → Hari ini + jam", () => {
    expect(
      formatLastViewed(
        new Date(2026, 10, 19, 14, 20),
        new Date(2026, 10, 19, 18, 5),
      ),
    ).toBe("Hari ini 14.20");
  });

  it("kemarin → Kemarin + jam", () => {
    expect(
      formatLastViewed(
        new Date(2026, 10, 18, 9, 5),
        new Date(2026, 10, 19, 18, 5),
      ),
    ).toBe("Kemarin 09.05");
  });

  it("lebih lama → tanggal Indonesia + jam", () => {
    expect(
      formatLastViewed(
        new Date(2026, 10, 12, 20, 45),
        new Date(2026, 10, 19, 18, 5),
      ),
    ).toBe("12 Nov 2026 20.45");
  });

  it("lewat tengah malam dihitung per tanggal kalender", () => {
    expect(
      formatLastViewed(
        new Date(2026, 10, 18, 23, 50),
        new Date(2026, 10, 19, 0, 10),
      ),
    ).toBe("Kemarin 23.50");
  });
});
