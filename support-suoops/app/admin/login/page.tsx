"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, AlertCircle, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useAdminAuth } from "../layout";

type Step = "email" | "otp";

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { requestOtp, verifyOtp } = useAdminAuth();
  const router = useRouter();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.toLowerCase().endsWith("@suoops.com")) {
      setError("Only @suoops.com email addresses can access the admin panel.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOtp(email);
      if (result.ok) {
        setStep("otp");
        setInfo("We sent a 6-digit code to your email. It expires in 10 minutes.");
      } else {
        setError(result.message);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await verifyOtp(email, otp.trim());
      if (success) {
        router.push("/admin");
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const result = await requestOtp(email);
      if (result.ok) {
        setInfo("A new code has been sent.");
      } else {
        setError(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl font-bold mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold text-white">SuoOps Admin</h1>
          <p className="text-slate-400 mt-1">Passwordless Dashboard Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          {info && !error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              {info}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequestCode}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    placeholder="you@suoops.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Email me a login code
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-2">
                    Enter the 6-digit code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] font-semibold text-slate-900 placeholder-slate-300 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    placeholder="------"
                  />
                  <p className="mt-2 text-xs text-slate-500">Sent to {email}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify &amp; sign in
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setInfo("");
                  }}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          No passwords. Codes are emailed to your @suoops.com address.
        </p>
      </div>
    </div>
  );
}
