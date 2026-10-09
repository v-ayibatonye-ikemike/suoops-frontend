import { isAxiosError } from "axios";

export function getResponseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  if ("detail" in payload) {
    if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
    if (payload.detail && typeof payload.detail === "object" && "message" in payload.detail) {
      if (typeof payload.detail.message === "string" && payload.detail.message.trim()) {
        return payload.detail.message;
      }
    }
  }
  if ("error" in payload && payload.error && typeof payload.error === "object") {
    if ("message" in payload.error && typeof payload.error.message === "string") {
      return payload.error.message.trim() || fallback;
    }
  }
  return fallback;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError(error)
    ? getResponseErrorMessage(error.response?.data, fallback)
    : fallback;
}
