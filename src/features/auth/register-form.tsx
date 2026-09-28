"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";

import {
  requestSignupOTP,
  verifySignupOTP,
  resendOTP,
  getOTPDeliveryStatus,
  getOTPChannel,
  type SignupStartPayload,
  type OTPDeliveryStatus,
  type OTPChannel,
} from "./auth-api";
import { useAuthStore } from "./auth-store";
import { OTPInput } from "./otp-input";
import axios from "axios";
import { getConfig } from "@/lib/config";
import { Gift, CheckCircle2, MessageCircle, Building2, CreditCard } from "lucide-react";
import { trackSignupConversion } from "@/lib/gtag-events";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { NIGERIAN_BANKS } from "@/features/settings/bank-details-form.constants";

type Step = "details" | "otp" | "bank";

/**
 * Normalize a Nigerian phone number to E.164 format (+234...).
 * Accepts: 08012345678, +2348012345678, 2348012345678, 8012345678
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "+234" + digits.slice(1);
  if (digits.startsWith("234") && digits.length === 13) return "+" + digits;
  if (digits.length === 10 && !digits.startsWith("0")) return "+234" + digits;
  return "+" + digits;
}

function isValidNigerianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+234[789]\d{9}$/.test(normalized);
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [step, setStep] = useState<Step>("details");
  const [formValues, setFormValues] = useState<SignupStartPayload | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [deliveryFailure, setDeliveryFailure] = useState<OTPDeliveryStatus | null>(null);
  const [otpChannel, setOtpChannel] = useState<OTPChannel>("email");

  // Bank details state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [validatingReferral, setValidatingReferral] = useState(false);
  // Terms & Conditions acceptance (required before signup)
  const [acceptTerms, setAcceptTerms] = useState(false);

  const canResend = useMemo(() => resendTimer === 0, [resendTimer]);

  // Check for referral code in URL on mount
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  // Derive signup source from URL parameters
  const signupSource = useMemo(() => {
    // Priority: explicit ?source= > utm_source > utm_medium > referral > organic
    const source = searchParams.get("source");
    if (source) return source;

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");

    if (utmSource === "google" || utmSource === "google_ads") return "google_ads";
    if (utmSource === "instagram" || utmSource === "ig") return "instagram";
    if (utmSource === "whatsapp" || utmSource === "wa") return "whatsapp_ad";
    if (utmSource === "facebook" || utmSource === "fb") return "facebook";
    if (utmSource === "twitter" || utmSource === "x") return "twitter";
    if (utmSource === "tiktok") return "tiktok";
    if (utmSource) return `social_${utmSource}`;

    if (utmMedium === "cpc" || utmMedium === "ppc") return "google_ads";
    if (utmMedium === "social") return "social_media";

    if (searchParams.get("ref")) return "referral";
    if (searchParams.get("gclid")) return "google_ads";
    if (searchParams.get("fbclid")) return "facebook";

    return "organic";
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 3) {
      setReferralValid(null);
      setReferrerName(null);
      return;
    }
    
    setValidatingReferral(true);
    try {
      const { apiBaseUrl } = getConfig();
      const response = await axios.post<{ valid: boolean; referrer_name?: string; error?: string }>(
        `${apiBaseUrl}/referrals/validate`,
        { code: code.toUpperCase() },
        { headers: { "Content-Type": "application/json" }, withCredentials: true }
      );
      setReferralValid(response.data.valid);
      setReferrerName(response.data.referrer_name || null);
    } catch (err: unknown) {
      // Only mark as invalid if it's a 4xx response (client error / not found)
      // For network errors or 5xx, keep as null (unknown) so user can still try
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500) {
        setReferralValid(false);
      } else {
        // Network error or server error - don't show as invalid, just reset
        setReferralValid(null);
      }
      setReferrerName(null);
    } finally {
      setValidatingReferral(false);
    }
  };

  const startResendCountdown = useCallback(() => {
    setResendTimer(60);
    const interval = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleRequestOTP = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const rawPhone = String(form.get("phone") ?? "").trim();
      const emailValue = String(form.get("email") ?? "").trim().toLowerCase();

      if (!rawPhone) {
        setError("Please enter your WhatsApp phone number.");
        return;
      }

      if (!isValidNigerianPhone(rawPhone)) {
        setError("Please enter a valid Nigerian phone number (e.g. 08012345678).");
        return;
      }

      const phone = normalizePhone(rawPhone);

      const businessName = String(form.get("business-name") ?? "").trim();
      if (!businessName) {
        setError("Please enter your business or brand name.");
        return;
      }

      // Email is required — login verification codes are sent by email.
      if (!emailValue) {
        setError("Please enter your email address — we send your login codes there.");
        return;
      }
      if (!emailValue.includes("@") || !emailValue.split("@")[1]?.includes(".")) {
        setError("Please enter a valid email address.");
        return;
      }

      if (!acceptTerms) {
        setError("Please accept the Terms & Conditions to continue.");
        return;
      }

      const payload: SignupStartPayload = {
        name: String(form.get("name") ?? "").trim(),
        phone,
        business_name: businessName,
        email: emailValue,
        accept_terms: true,
      };
      // Include referral code if it looks valid (length >= 3)
      // Backend will do final validation - this ensures code is sent even if
      // frontend validation had network issues
      if (referralCode && referralCode.length >= 3) {
        // Only block if we explicitly know the code is invalid
        if (referralValid === false) {
          setError("Please enter a valid referral code or leave the field empty.");
          return;
        }
        payload.referral_code = referralCode.toUpperCase();
      }
      // Attach attribution source
      payload.signup_source = signupSource;
      if (!payload.name) {
        setError("Please provide your name.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Attach a best-effort device fingerprint for anti-fraud / duplicate
        // account detection. Never blocks signup if it can't be computed.
        try {
          const fingerprint = await getDeviceFingerprint();
          if (fingerprint) {
            payload.device_fingerprint = fingerprint;
          }
        } catch {
          /* fingerprinting is best-effort — ignore failures */
        }
        const response = await requestSignupOTP(payload);
        setOtpChannel(getOTPChannel(response, "email"));
        setFormValues(payload);
        setDeliveryFailure(null);
        setStep("otp");
        setOtp("");
        startResendCountdown();
      } catch (requestError: unknown) {
        console.error(requestError);
        const response = (requestError as { response?: { data?: { detail?: unknown }; status?: number } }).response;
        const rawDetail = response?.data?.detail;
        // FastAPI 422 returns `detail` as an array of validation errors; coalesce to a string.
        const message: string | undefined = Array.isArray(rawDetail)
          ? rawDetail
              .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
              .join(" ")
          : typeof rawDetail === "string"
            ? rawDetail
            : undefined;

        // Provide specific guidance based on error type
        if (message?.toLowerCase().includes("already") || response?.status === 409) {
          setError("This phone number is already registered. Please log in instead.");
        } else if (message?.toLowerCase().includes("too many")) {
          setError("Too many attempts. Please wait a few minutes before trying again.");
        } else if (message?.toLowerCase().includes("referral")) {
          setError("That referral code isn't valid. Please correct it or clear the field, then try again.");
        } else if (!navigator.onLine) {
          setError("You appear to be offline. Please check your internet connection.");
        } else {
          setError(
            message ||
              "We couldn't send your verification code. Check that your email address is correct, then try again."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [startResendCountdown, referralCode, referralValid, acceptTerms, signupSource]
  );

  const handleVerifyOTP = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formValues) {
        setError("Session expired. Please restart signup.");
        setStep("details");
        return;
      }
      if (otp.length !== 6) {
        setError(`Enter the 6-digit code sent to your ${otpChannel === "email" ? "email" : "WhatsApp"}.`);
        return;
      }
      // OTP looks valid — move to bank details step
      setError(null);
      setStep("bank");
    },
    [formValues, otp, otpChannel]
  );

  const handleCompleteSignup = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formValues) {
        setError("Session expired. Please restart signup.");
        setStep("details");
        return;
      }
      if (!bankName) {
        setError("Please select your bank.");
        return;
      }
      if (!accountNumber || accountNumber.length !== 10) {
        setError("Please enter a valid 10-digit account number.");
        return;
      }
      if (!accountName.trim()) {
        setError("Please enter the account name.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = await verifySignupOTP({
          phone: formValues.phone,
          otp,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName.trim(),
        });
        setTokens({ accessToken: token.access_token, accessExpiresAt: token.access_expires_at });

        // Fire Google Ads conversion event on successful signup
        trackSignupConversion();

        router.replace("/dashboard");
      } catch (verifyError: unknown) {
        console.error(verifyError);
        const response = (verifyError as { response?: { data?: { detail?: string }; status?: number } }).response;
        const message = response?.data?.detail;
        
        if (message?.toLowerCase().includes("expired")) {
          setError("OTP expired. Please go back and request a new one.");
          setOtp("");
          setStep("otp");
        } else if (message?.toLowerCase().includes("invalid") || response?.status === 401) {
          setError("Invalid OTP. Please go back and try again.");
          setOtp("");
          setStep("otp");
        } else {
          setError(message || "Signup failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [formValues, otp, bankName, accountNumber, accountName, router, setTokens]
  );

  const handleResend = useCallback(async () => {
    if (!formValues || !canResend) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setDeliveryFailure(null);
      const response = await resendOTP({ phone: formValues.phone, purpose: "signup" });
      setOtpChannel(getOTPChannel(response, otpChannel));
      setOtp("");
      startResendCountdown();
    } catch (resendError: unknown) {
      console.error(resendError);
      const message =
        typeof resendError === "object" && resendError !== null && "response" in resendError
          ? (resendError as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(message || "Please wait before requesting another code.");
    } finally {
      setLoading(false);
    }
  }, [canResend, formValues, otpChannel, startResendCountdown]);

  // Poll the backend for asynchronous WhatsApp delivery-status updates so
  // that if Meta later reports the OTP message as undeliverable (e.g. the
  // number is not on WhatsApp, the recipient is in a restricted region, or
  // the business account has a payment issue) we can surface that to the
  // user instead of leaving them stuck on the OTP screen.
  useEffect(() => {
    if (step !== "otp" || otpChannel !== "whatsapp" || !formValues?.phone) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8; // ~32s of polling
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const status = await getOTPDeliveryStatus({
          purpose: "signup",
          phone: formValues.phone,
        });
        if (cancelled) return;
        if (status.state === "failed") {
          setDeliveryFailure(status);
          return; // stop polling
        }
      } catch (pollError) {
        // Non-fatal — keep polling.
        console.debug("OTP status poll failed", pollError);
      }
      if (!cancelled && attempts < maxAttempts) {
        timer = setTimeout(tick, 4000);
      }
    };
    let timer = setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, otpChannel, formValues?.phone]);

  if (step === "otp") {
    return (
      <form className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" onSubmit={handleVerifyOTP}>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Verify your {otpChannel === "email" ? "email" : "WhatsApp number"}
          </h1>
          <p className="text-sm text-slate-500">
            Enter the verification code sent to{" "}
            <span className="font-semibold text-slate-700">
              {otpChannel === "email" ? formValues?.email : formValues?.phone}
            </span>
            {otpChannel === "email" ? ". You'll verify your WhatsApp number next." : "."}
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        {deliveryFailure ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            role="alert"
          >
            <p className="font-semibold">We couldn&apos;t deliver your code on WhatsApp.</p>
            <p className="mt-1">
              {deliveryFailure.title
                ? `Reason: ${deliveryFailure.title}. `
                : ""}
              Please confirm <span className="font-semibold">{formValues?.phone}</span> is an
              active WhatsApp account, then tap Resend. If it still fails, try a
              different WhatsApp number.
            </p>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-4">
          <OTPInput value={otp} onChange={setOtp} disabled={loading} hasError={Boolean(error)} />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {canResend ? "Resend code" : `Resend available in ${resendTimer}s`}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setOtp("");
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Change signup details
          </button>
        </div>
      </form>
    );
  }

  if (step === "bank") {
    return (
      <form className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" onSubmit={handleCompleteSignup}>
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Add your bank details</h1>
          <p className="text-sm text-slate-500">
            Your customers need to know where to pay. This is shown on your invoices.
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-left text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            Bank name
          </span>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
          >
            <option value="">Select your bank</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-left text-sm font-semibold text-slate-700">
          Account number
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="0123456789"
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-left text-sm font-semibold text-slate-700">
          Account name
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="John Doe / Trendy Hair Empire"
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
          />
          <span className="text-xs font-normal text-slate-400">
            The name on your bank account — customers will see this on invoices
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Complete Registration"}
        </button>
        <p className="text-center text-xs text-slate-400">
          You can update bank details anytime in Settings
        </p>
      </form>
    );
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" onSubmit={handleRequestOTP}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-500">Sign up with your WhatsApp number to start invoicing in seconds.</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        Business name
        <input
          name="business-name"
          placeholder="e.g. Trendy Hair Empire"
          required
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
        <span className="text-xs font-normal text-slate-400">
          Your brand or shop name — shown on invoices to your customers
        </span>
      </label>
      <label className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          WhatsApp number
        </span>
        <input
          name="phone"
          type="tel"
          placeholder="08012345678"
          required
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
        <span className="text-xs font-normal text-slate-400">
          We&apos;ll use this number for the invoice bot and as a backup if email delivery fails
        </span>
      </label>
      <label className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        Your name
        <input
          name="name"
          placeholder="Jane Doe"
          required
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
      </label>
      <label className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        Email address
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
        <span className="text-xs font-normal text-slate-400">We&apos;ll send your signup and login verification codes here.</span>
      </label>
      
      {/* Referral Code Input */}
      <div className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        <label htmlFor="referral-code" className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-600" />
          Referral code <span className="text-xs font-normal text-slate-400">Optional</span>
        </label>
        <input
          id="referral-code"
          name="referral-code"
          placeholder="ABCD1234"
          maxLength={50}
          value={referralCode}
          onChange={(e) => {
            const code = e.target.value.toUpperCase();
            setReferralCode(code);
            if (code.length >= 3) {
              validateReferralCode(code);
            } else {
              setReferralValid(null);
              setReferrerName(null);
            }
          }}
          className={`rounded-lg border bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition uppercase tracking-wider ${
            referralValid === true
              ? "border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              : referralValid === false
              ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
              : "border-slate-200 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
          }`}
        />
        {validatingReferral && (
          <p className="text-xs text-slate-500">Validating...</p>
        )}
        {referralValid === true && referrerName && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Referred by {referrerName}
          </p>
        )}
        {referralValid === false && referralCode.length >= 3 && (
          <p className="text-xs text-rose-500">Invalid referral code</p>
        )}
      </div>
      
      <label className="flex items-start gap-2.5 text-left text-sm text-slate-600">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-green-600 focus:ring-green-600"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-green-700 underline hover:text-green-800"
          >
            Terms &amp; Conditions
          </Link>
          , including the buyer-protection (escrow) policy that holds storefront
          payments until the customer confirms delivery.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !acceptTerms}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending code..." : "Send verification code"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-green-600 hover:text-green-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
