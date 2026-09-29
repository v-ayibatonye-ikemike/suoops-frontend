"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { exchangeOAuthCode, OAuthExchangeError } from "@/features/auth/oauth-client";
import { getSafeRedirectPath } from "@/features/auth/safe-redirect";
import { telemetry } from "@/lib/telemetry";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const exchangeAttemptedRef = React.useRef(false);

  useEffect(() => {
    // Prevent double-execution in React Strict Mode
    if (exchangeAttemptedRef.current) return;
    exchangeAttemptedRef.current = true;

    const run = async () => {
      try {
        const code = searchParams?.get("code");
        const state = searchParams?.get("state");
        const providerError = searchParams?.get("error");

        if (providerError) {
          const message = providerError === "access_denied"
            ? "Sign in cancelled. You can try again."
            : `Provider returned error: ${providerError}`;
          throw new OAuthExchangeError("provider_cancelled", message);
        }

        const data = await exchangeOAuthCode(code, state, { provider: "google", retries: 2, timeoutMs: 12000 });
        const accessExpiresAt = typeof data.access_expires_at === "string"
          ? data.access_expires_at
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        setTokens({ accessToken: data.access_token, accessExpiresAt });
        setProcessing(false);
        telemetry.oauthCallbackSuccess();
        router.replace(getSafeRedirectPath(searchParams?.get("next")));
      } catch (err) {
        let message = "We couldn't complete your sign in. Please try again.";
        if (err instanceof OAuthExchangeError) {
          switch (err.kind) {
            case "invalid_state":
              message = "Security check failed. Please start sign in again from the beginning.";
              break;
            case "missing_params":
              message = "Missing sign in information. Please try signing in again.";
              break;
            case "provider_cancelled":
              message = err.message;
              break;
            case "network":
              message = "Connection issue. Please check your internet and try again.";
              break;
            case "server":
              // User-friendly message for server errors (500)
              message = "Our sign in service is temporarily unavailable. Please try again in a few moments.";
              break;
            case "client":
              // For 400/401/403 errors, show more specific messages if available
              if (err.message && !err.message.includes("Internal server")) {
                message = err.message;
              } else {
                message = "Invalid sign in request. Please try again.";
              }
              break;
            default:
              message = "Sign in failed. Please try again.";
          }
        } else if (err instanceof Error) {
          // Don't show technical error messages to users
          if (!err.message.includes("Internal server") && !err.message.includes("500")) {
            message = err.message;
          }
        }
        telemetry.oauthCallbackError(err instanceof OAuthExchangeError ? err.kind : "unknown", message);
        setError(message);
        setProcessing(false);
      }
    };
    run();
    // Only run on initial mount/searchParams change
  }, [searchParams, setTokens, router]);

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700" role="status" aria-live="polite">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-10 shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" aria-label="Loading" />
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold text-slate-900">Completing sign in…</h1>
              <p className="text-sm text-slate-500">Verifying your account. This may take a few seconds.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl" aria-live="assertive">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Sign in failed</h1>
            <p className="text-sm text-slate-500">We couldn&apos;t complete your sign in.</p>
          </div>
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Back to sign in
            </button>
            <button
              onClick={() => {
                // OAuth codes are single-use, so we need to start fresh
                router.push("/login");
              }}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
