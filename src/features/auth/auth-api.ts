"use client";

import axios from "axios";

import { getConfig } from "@/lib/config";

const { apiBaseUrl } = getConfig();

export type TokenPayload = {
  access_token: string;
  token_type: string;
  access_expires_at: string;
  refresh_token?: string | null;
};

export type MessagePayload = { detail: string };

export type OTPChannel = "email" | "whatsapp";

export function getOTPChannel(message: MessagePayload, fallback: OTPChannel): OTPChannel {
  const detail = message.detail.toLowerCase();
  if (detail.includes("email")) return "email";
  if (detail.includes("whatsapp")) return "whatsapp";
  return fallback;
}

export type SignupStartPayload = {
  phone: string;
  email?: string | null;
  name: string;
  business_name: string;
  accept_terms?: boolean;
  referral_code?: string | null;
  signup_source?: string | null;
  device_fingerprint?: string | null;
};

export type SignupVerifyPayload = {
  phone: string;
  otp: string;
  bank_name: string;
  account_number: string;
  account_name: string;
};

export type LoginRequestPayload = { 
  phone?: string | null;
  email?: string | null;
};

export type LoginVerifyPayload = {
  phone?: string | null;
  email?: string | null;
  otp: string;
};

export type OTPResendPayload = {
  phone?: string | null;
  email?: string | null;
  purpose: "signup" | "login";
};

const jsonHeaders = { "Content-Type": "application/json" };

export async function requestSignupOTP(payload: SignupStartPayload): Promise<MessagePayload> {
  const { data } = await axios.post<MessagePayload>(`${apiBaseUrl}/auth/signup/request`, payload, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export async function verifySignupOTP(payload: SignupVerifyPayload): Promise<TokenPayload> {
  const { data } = await axios.post<TokenPayload>(`${apiBaseUrl}/auth/signup/verify`, payload, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export async function requestLoginOTP(payload: LoginRequestPayload): Promise<MessagePayload> {
  const { data } = await axios.post<MessagePayload>(`${apiBaseUrl}/auth/login/request`, payload, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export async function verifyLoginOTP(payload: LoginVerifyPayload): Promise<TokenPayload> {
  const { data } = await axios.post<TokenPayload>(`${apiBaseUrl}/auth/login/verify`, payload, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export async function resendOTP(payload: OTPResendPayload): Promise<MessagePayload> {
  const { data } = await axios.post<MessagePayload>(`${apiBaseUrl}/auth/otp/resend`, payload, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export type OTPDeliveryStatus = {
  state: "pending" | "failed" | "none";
  code?: string | null;
  title?: string | null;
  detail?: string | null;
};

export async function getOTPDeliveryStatus(params: {
  purpose: "signup" | "login";
  phone?: string | null;
  email?: string | null;
}): Promise<OTPDeliveryStatus> {
  const query = new URLSearchParams({ purpose: params.purpose });
  if (params.phone) query.set("phone", params.phone);
  if (params.email) query.set("email", params.email);
  const { data } = await axios.get<OTPDeliveryStatus>(
    `${apiBaseUrl}/auth/otp/status?${query.toString()}`,
    { withCredentials: true },
  );
  return data;
}

export async function refreshSession(): Promise<TokenPayload> {
  const { data } = await axios.post<TokenPayload>(`${apiBaseUrl}/auth/refresh`, {}, {
    headers: jsonHeaders,
    withCredentials: true,
  });
  return data;
}

export async function logout(): Promise<void> {
  await axios.post(`${apiBaseUrl}/auth/logout`, {}, {
    headers: jsonHeaders,
    withCredentials: true,
  });
}
