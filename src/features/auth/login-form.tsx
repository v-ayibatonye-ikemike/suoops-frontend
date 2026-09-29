"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { requestLoginOTP, verifyLoginOTP, resendOTP, getOTPDeliveryStatus, type OTPDeliveryStatus } from "./auth-api";
import { useAuthStore } from "./auth-store";
import { OTPInput } from "./otp-input";
import { getSafeRedirectPath } from "./safe-redirect";
import { MessageCircle } from "lucide-react";

type Step = "identifier" | "otp";

/**
 * Normalize a Nigerian phone number to E.164 format (+234...).
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "+234" + digits.slice(1);
  if (digits.startsWith("234") && digits.length === 13) return "+" + digits;
  if (digits.length === 10 && !digits.startsWith("0")) return "+234" + digits;
  return "+" + digits;
}

function isPhoneInput(value: string): boolean {
  const trimmed = value.trim();
  return /^[+\d][\d\s\-()]{6,}$/.test(trimmed) && !trimmed.includes("@");
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"phone" | "email">("phone");
  // Where the OTP was actually delivered (a phone login is emailed the code when
  // the account has an email on file, to avoid paid WhatsApp messages).
  const [otpChannel, setOtpChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [deliveryFailure, setDeliveryFailure] = useState<OTPDeliveryStatus | null>(null);

  const canResend = useMemo(() => resendTimer === 0, [resendTimer]);

  const startCountdown = useCallback(() => {
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

  const rawNext = searchParams?.get("next") ?? "/dashboard";
  const nextRoute = getSafeRedirectPath(rawNext);

  const handleRequestOTP = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!identifier.trim()) {
        setError("Enter your WhatsApp number or email address.");
        return;
      }
      setLoading(true);
      setError(null);

      const isPhone = isPhoneInput(identifier);
      setIdentifierType(isPhone ? "phone" : "email");

      try {
        if (isPhone) {
          const phone = normalizePhone(identifier.trim());
          const res = await requestLoginOTP({ phone });
          setIdentifier(phone);
          setOtpChannel(res?.detail?.toLowerCase().includes("email") ? "email" : "whatsapp");
        } else {
          const normalizedEmail = identifier.trim().toLowerCase();
          await requestLoginOTP({ email: normalizedEmail });
          setIdentifier(normalizedEmail);
          setOtpChannel("email");
        }
        setDeliveryFailure(null);
        setStep("otp");
        setOtp("");
        startCountdown();
      } catch (requestError: unknown) {
        console.error(requestError);
        const response = (requestError as { response?: { data?: { detail?: string }; status?: number } }).response;
        const message = response?.data?.detail;
        
        if (response?.status === 404 || message?.toLowerCase().includes("not found")) {
          setError("No account found. Please check your details or sign up for a new account.");
        } else if (message?.toLowerCase().includes("too many")) {
          setError("Too many login attempts. Please wait a few minutes before trying again.");
        } else if (!navigator.onLine) {
          setError("You appear to be offline. Please check your internet connection.");
        } else {
          setError(
            message ||
              "We couldn't send your verification code. Make sure the WhatsApp number you used to sign up is active on this device, then try again."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [identifier, startCountdown]
  );

  const handleVerifyOTP = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (otp.length !== 6) {
        setError(otpChannel === "whatsapp" ? "Enter the 6-digit code sent to your WhatsApp." : "Enter the 6-digit code sent to your email.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = identifierType === "phone" ? { phone: identifier, otp } : { email: identifier, otp };
        const tokens = await verifyLoginOTP(payload);
        setTokens({ accessToken: tokens.access_token, accessExpiresAt: tokens.access_expires_at });
        router.replace(nextRoute);
      } catch (verifyError: unknown) {
        console.error(verifyError);
        setOtp("");
        const response = (verifyError as { response?: { data?: { detail?: string }; status?: number } }).response;
        const message = response?.data?.detail;
        
        // Provide specific guidance based on error type
        if (message?.toLowerCase().includes("expired")) {
          setError("This code has expired. Please request a new one.");
        } else if (message?.toLowerCase().includes("invalid") || response?.status === 401) {
          setError("Invalid code. Please check and try again, or request a new code.");
        } else if (message?.toLowerCase().includes("too many")) {
          setError("Too many failed attempts. Please wait a few minutes and try again.");
        } else {
          setError(message || "Verification failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [nextRoute, otp, otpChannel, identifier, identifierType, router, setTokens]
  );

  const handleResend = useCallback(async () => {
    if (!canResend) {
      return;
    }
    setLoading(true);
    setError(null);
    setDeliveryFailure(null);
    try {
      const payload = identifierType === "phone" ? { phone: identifier, purpose: "login" as const } : { email: identifier, purpose: "login" as const };
      await resendOTP(payload);
      setOtp("");
      startCountdown();
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
  }, [canResend, identifier, identifierType, startCountdown]);

  // Poll for asynchronous WhatsApp delivery-status updates (failed delivery
  // is reported via Meta webhook well after the synchronous send returned
  // "accepted"). Email OTPs deliver synchronously so we only poll when the
  // code actually went out over WhatsApp.
  useEffect(() => {
    if (step !== "otp" || otpChannel !== "whatsapp" || !identifier) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8; // ~32s
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const status = await getOTPDeliveryStatus({ purpose: "login", phone: identifier });
        if (cancelled) return;
        if (status.state === "failed") {
          setDeliveryFailure(status);
          return;
        }
      } catch (pollError) {
        console.debug("OTP status poll failed", pollError);
      }
      if (!cancelled && attempts < maxAttempts) {
        timer = setTimeout(tick, 4000);
      }
    };
    timer = setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, otpChannel, identifier]);

  const handleGoogleSignIn = useCallback(() => {
    // Provide callback URL with optional next param so backend returns it and callback page can route properly.
    const callbackBase = `${window.location.origin}/auth/callback`;
    const withNext = `${callbackBase}?next=${encodeURIComponent(nextRoute)}`;
    const redirectUri = encodeURIComponent(withNext);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.suoops.com';
    window.location.href = `${apiUrl}/auth/oauth/google/login?redirect_uri=${redirectUri}`;
  }, [nextRoute]);

  if (step === "otp") {
    return (
      <form className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" onSubmit={handleVerifyOTP}>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Enter the code</h1>
          <p className="text-sm text-slate-500">
            We sent a 6-digit OTP to <span className="font-semibold text-slate-700">{identifier}</span>{otpChannel === "whatsapp" ? " on WhatsApp" : " — check your email"}
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
              {deliveryFailure.title ? `Reason: ${deliveryFailure.title}. ` : ""}
              Please confirm <span className="font-semibold">{identifier}</span> is an active
              WhatsApp account on this device, then tap Resend.
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
            {loading ? "Signing in..." : "Verify & Sign in"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {canResend ? "Resend code" : `Resend in ${resendTimer}s`}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setOtp("");
              setError(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Use a different number or email
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" onSubmit={handleRequestOTP}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">Enter your WhatsApp number or email to receive a one-time code.</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      
      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-slate-500">Or continue with phone or email</span>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-left text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          WhatsApp number or email
        </span>
        <input
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="08012345678 or you@example.com"
          required
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending code..." : "Send login code"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-green-600 hover:text-green-700 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
