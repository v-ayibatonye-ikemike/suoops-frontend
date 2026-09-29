"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, ArrowRight } from "lucide-react";
import { apiClient } from "@/api/client";
import { requestBankChangeOtp, updateBankDetails } from "@/api/bank-details";
import { NIGERIAN_BANKS } from "@/features/settings/bank-details-form.constants";

interface UserData {
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  business_name?: string | null;
  name?: string;
}

/**
 * Gate that blocks the dashboard until user has added bank details.
 * Users need bank details so customers know where to pay.
 *
 * Returns null (renders children) if bank details are set.
 * Returns a full-screen form if bank_name or account_number is missing.
 */
export function BankDetailsRequiredGate({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Step-up OTP: setting a payout account requires a code sent to the owner.
  const [otpChallenge, setOtpChallenge] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    setDeferred(sessionStorage.getItem("bank-details-gate-deferred") === "true");
  }, []);

  const { data: user, isLoading } = useQuery<UserData>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<UserData>("/users/me");
      return response.data;
    },
    staleTime: 60000,
  });

  if (isLoading) return <>{children}</>;

  // Bank details present — let through
  if ((user?.bank_name && user?.account_number) || deferred) return <>{children}</>;

  const firstName = user?.name?.split(" ")[0] || "there";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    // Step-up: setting a payout account requires an OTP. First request the code,
    // then submit the details together with it.
    if (!otpChallenge) {
      setLoading(true);
      try {
        await requestBankChangeOtp();
        setOtpChallenge(true);
      } catch (err) {
        const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(message || "Couldn't send your confirmation code. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (otpCode.trim().length < 4) {
      setError("Enter the confirmation code we sent you.");
      return;
    }

    setLoading(true);
    try {
      await updateBankDetails({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName.trim(),
        otp: otpCode.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(message || "Failed to save bank details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-evergreen to-brand-teal px-4 py-10">
      <form onSubmit={handleSave} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-jade/10">
            <CreditCard className="h-7 w-7 text-brand-jade" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Almost there, {firstName}!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Add your bank details so customers know where to pay you. This is shown on your invoices.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
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

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
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

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
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
              The name on your bank account — customers will see this
            </span>
          </label>
        </div>

        {otpChallenge && (
          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
            Confirmation code
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
            />
            <span className="text-xs font-normal text-slate-400">
              We sent a code to confirm it&apos;s you — this keeps your payout account safe.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-jade px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading
            ? "Saving..."
            : otpChallenge
              ? "Confirm & Start Invoicing"
              : "Send confirmation code"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("bank-details-gate-deferred", "true");
            setDeferred(true);
          }}
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          I&apos;ll do this later
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          You can explore the dashboard now, but bank details are required before
          you can collect payouts. Add them anytime in Settings.
        </p>
      </form>
    </div>
  );
}
