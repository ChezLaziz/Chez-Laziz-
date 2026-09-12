import { describe, expect, it } from "vitest";
import { verdictAutoTest } from "./selfCheck";

describe("verdictAutoTest", () => {
  it("200 est le seul verdict acceptable", () => {
    expect(verdictAutoTest(200).ok).toBe(true);
  });
  it("405 (lecture refusée en POST), 500 et 0 (injoignable) sont des échecs nommés", () => {
    for (const s of [405, 500, 0]) {
      const v = verdictAutoTest(s);
      expect(v.ok).toBe(false);
      expect(v.message).toContain(String(s));
    }
  });
});
