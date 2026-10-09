import { describe, expect, it } from "vitest";
import { getApiErrorMessage, getResponseErrorMessage } from "../errors";

describe("API error messages", () => {
  it.each([
    { detail: "Invoice is no longer overdue" },
    { detail: { message: "Invoice is no longer overdue" } },
    { error: { message: "Invoice is no longer overdue" } },
  ])("extracts an actionable server message from %j", (payload) => {
    expect(getResponseErrorMessage(payload, "Try again")).toBe("Invoice is no longer overdue");
    expect(getApiErrorMessage({ isAxiosError: true, response: { data: payload } }, "Try again"))
      .toBe("Invoice is no longer overdue");
  });

  it.each([null, {}, { detail: [{ msg: "invalid" }] }, { detail: " " }])(
    "uses the visible fallback for unsupported payload %j",
    (payload) => expect(getResponseErrorMessage(payload, "Please try again")).toBe("Please try again"),
  );

  it("does not expose internal network error text", () => {
    expect(getApiErrorMessage(new Error("internal details"), "Please try again")).toBe("Please try again");
  });
});
