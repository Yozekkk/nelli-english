import { expect, test } from "bun:test";
import { previousLocalDateKey } from "./date";

test("previous local date stays correct across the spring clock change", () => {
  const morningAfterClockChange = new Date(2026, 2, 30, 0, 30);
  expect(previousLocalDateKey(morningAfterClockChange)).toBe("2026-03-29");
});
