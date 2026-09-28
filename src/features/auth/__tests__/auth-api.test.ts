import { describe, expect, it } from "vitest";

import { getOTPChannel } from "../auth-api";

describe("getOTPChannel", () => {
  it("uses the delivery channel returned by the backend", () => {
    expect(getOTPChannel({ detail: "OTP sent to email" }, "whatsapp")).toBe("email");
    expect(getOTPChannel({ detail: "OTP sent to WhatsApp" }, "email")).toBe("whatsapp");
    expect(getOTPChannel({ detail: "OTP resent to email" }, "whatsapp")).toBe("email");
  });

  it("keeps the current channel when the response does not name one", () => {
    expect(getOTPChannel({ detail: "OTP sent" }, "email")).toBe("email");
  });
});
