import { describe, expect, it } from "vitest";
import { badExamples, examplesChecked } from "./specValidator";

describe("spec examples", () => {
  it("all match the schema they belong to, so the mock server serves valid responses", () => {
    expect(badExamples()).toEqual([]);
    expect(examplesChecked).toBeGreaterThan(20);
  });
});
