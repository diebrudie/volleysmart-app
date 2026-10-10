import { describe, it, expect } from "vitest";
import { eventInCity } from "@volleysmart/core";

describe("eventInCity", () => {
  it("uses the club city when the event has a club", () => {
    expect(eventInCity({ clubs: { city: "Berlin" } }, "berlin")).toBe(true);
    expect(eventInCity({ clubs: { city: "Hamburg" }, locations: { address: "Berlin" } }, "Berlin")).toBe(false);
  });

  it("falls back to the location address as a whole word", () => {
    expect(eventInCity({ clubs: null, locations: { address: "Berliner Straße, 13189 Berlin, Germany" } }, "Berlin")).toBe(true);
    expect(eventInCity({ clubs: null, locations: { address: "Berliner Straße 5, 20095 Hamburg" } }, "Berlin")).toBe(false);
    expect(eventInCity({ clubs: null, locations: null }, "Berlin")).toBe(false);
  });
});
