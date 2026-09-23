"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

interface TaxProfileData {
  user_id: number;
  business_size: string;
  is_small_business: boolean;
  registration: {
    tin: string | null;
    tin_verified?: boolean;
    vat_registered: boolean;
    vat_number: string | null;
    firs_registered: boolean;
    firs_merchant_id: string | null;
    business_type: string;
    vat_apply_to: string;
    withholding_vat_applies: boolean;
    rc_number?: string | null;
    cac_verified?: boolean;
    cac_registered_name?: string | null;
  };
  tax_rates: Record<string, number>;
  classification: {
    annual_turnover: number;
    fixed_assets: number;
    meets_small_criteria: boolean;
  };
  tax_benefits: Record<string, string>;
}

interface VerificationResult {
  verified: boolean;
  verification_status: string;
  charged_kobo: number;
  registered_name?: string | null;
  message: string;
}

interface TaxProfileUpdatePayload {
  vat_registered?: boolean;
  tin?: string;
  vat_registration_number?: string;
  business_type?: string;
  vat_apply_to?: string;
  withholding_vat_applies?: boolean;
}

export default function TaxProfileSettings() {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Local form state
  const [vatStatus, setVatStatus] = useState<"registered" | "not_registered" | "exempt">("not_registered");
  const [tin, setTin] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [businessType, setBusinessType] = useState<"goods" | "services" | "mixed">("mixed");
  const [vatApplyTo, setVatApplyTo] = useState<"all" | "selected">("all");
  const [withholdingVat, setWithholdingVat] = useState(false);
  const [rcNumber, setRcNumber] = useState("");

  const { data: profile, isLoading } = useQuery<TaxProfileData>({
    queryKey: ["taxProfile"],
    queryFn: async () => (await apiClient.get("/tax/profile")).data,
  });

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      const reg = profile.registration;
      if (reg.vat_registered) {
        setVatStatus("registered");
      } else {
        setVatStatus("not_registered");
      }
      setTin(reg.tin || "");
      setVatNumber(reg.vat_number || "");
      setBusinessType((reg.business_type as "goods" | "services" | "mixed") || "mixed");
      setVatApplyTo((reg.vat_apply_to as "all" | "selected") || "all");
      setWithholdingVat(reg.withholding_vat_applies || false);
      setRcNumber(reg.rc_number || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (payload: TaxProfileUpdatePayload) => {
      return (await apiClient.post("/tax/profile", payload)).data;
    },
    onSuccess: () => {
      toast.success("Tax profile updated");
      queryClient.invalidateQueries({ queryKey: ["taxProfile"] });
      queryClient.invalidateQueries({ queryKey: ["taxReport"] });
      queryClient.invalidateQueries({ queryKey: ["taxCompliance"] });
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    },
  });

  const verifyTinMutation = useMutation({
    mutationFn: async () => (await apiClient.post<VerificationResult>("/tax/profile/verify-tin")).data,
    onSuccess: (result) => {
      if (result.verified) {
        toast.success(`${result.message} (₦${(result.charged_kobo / 100).toFixed(2)} charged)`);
      } else {
        toast.error(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["taxProfile"] });
      queryClient.invalidateQueries({ queryKey: ["business-snapshot"] });
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string }; detail?: string } } }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || "TIN verification failed");
    },
  });

  const verifyCacMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post<VerificationResult>("/tax/profile/verify-cac", { rc_number: rcNumber })).data,
    onSuccess: (result) => {
      if (result.verified) {
        toast.success(`${result.message} (₦${(result.charged_kobo / 100).toFixed(2)} charged)`);
      } else {
        toast.error(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["taxProfile"] });
      queryClient.invalidateQueries({ queryKey: ["business-snapshot"] });
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string }; detail?: string } } }) => {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || "CAC verification failed");
    },
  });

  const handleSave = () => {
    const payload: TaxProfileUpdatePayload = {
      vat_registered: vatStatus === "registered",
      business_type: businessType,
      vat_apply_to: vatApplyTo,
      withholding_vat_applies: withholdingVat,
    };
    if (tin) payload.tin = tin;
    if (vatNumber) payload.vat_registration_number = vatNumber;
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" />
        </CardContent>
      </Card>
    );
  }

  const isVatEnabled = vatStatus === "registered";
  const hasChanges =
    profile &&
    (vatStatus !== (profile.registration.vat_registered ? "registered" : "not_registered") ||
      tin !== (profile.registration.tin || "") ||
      vatNumber !== (profile.registration.vat_number || "") ||
      businessType !== (profile.registration.business_type || "mixed") ||
      vatApplyTo !== (profile.registration.vat_apply_to || "all") ||
      withholdingVat !== (profile.registration.withholding_vat_applies || false));

  return (
    <Card className="mb-6 sm:mb-8">
      <CardHeader className="border-b border-brand-border/60 px-4 sm:px-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-brand-text">
                Tax Profile
              </h2>
              <p className="text-xs text-brand-textMuted">
                Tell SuoOps about your business so your invoices and reports are accurate.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick status badges */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isVatEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              VAT {isVatEnabled ? "ON" : "OFF"}
            </span>
            <svg
              className={`h-5 w-5 text-brand-textMuted transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-5 px-4 sm:px-6 space-y-6">
          {/* ── 1. VAT Status ── */}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-text">
              1. VAT Status
            </h3>
            <p className="mb-3 text-xs text-brand-textMuted">
              This controls whether VAT is calculated on your invoices. SuoOps does not decide your VAT status — you do.
            </p>
            <div className="space-y-2">
              {[
                { value: "registered", label: "VAT Registered", desc: "VAT will be calculated on invoices at 7.5%" },
                { value: "not_registered", label: "Not VAT Registered", desc: "No VAT on invoices (default)" },
                { value: "exempt", label: "VAT Exempt Business", desc: "VAT always zero — e.g. financial services" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    vatStatus === opt.value
                      ? "border-brand-primary bg-brand-jade/5"
                      : "border-brand-border hover:border-brand-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="vatStatus"
                    value={opt.value}
                    checked={vatStatus === opt.value}
                    onChange={(e) =>
                      setVatStatus(e.target.value as typeof vatStatus)
                    }
                    className="mt-0.5 accent-brand-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-brand-text">
                      {opt.label}
                    </span>
                    <p className="text-xs text-brand-textMuted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── 2. VAT Application Rules (shown only when VAT registered) ── */}
          {isVatEnabled && (
            <div className="rounded-lg border border-brand-border bg-brand-jade/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-brand-text">
                2. VAT Application Rules
              </h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-textMuted">
                  Default VAT Rate
                </label>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-3 py-1.5 text-sm font-semibold text-brand-text">
                    7.5%
                  </span>
                  <span className="text-xs text-brand-textMuted">
                    Nigeria standard rate (set by law)
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-brand-textMuted">
                  Apply VAT to
                </label>
                <div className="flex gap-2">
                  {([
                    { value: "all", label: "All invoices" },
                    { value: "selected", label: "Only selected items" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setVatApplyTo(opt.value)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        vatApplyTo === opt.value
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-brand-border bg-white text-brand-text hover:border-brand-primary/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withholdingVat}
                  onChange={(e) => setWithholdingVat(e.target.checked)}
                  className="mt-0.5 accent-brand-primary"
                />
                <div>
                  <span className="text-sm font-medium text-brand-text">
                    My customers sometimes withhold VAT
                  </span>
                  <p className="text-xs text-brand-textMuted">
                    Banks, telcos, and government agencies may withhold VAT before payment. This flags those transactions in reports.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ── 3. Business Type ── */}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-text">
              3. Business Type
            </h3>
            <p className="mb-3 text-xs text-brand-textMuted">
              Used only for reporting clarity — SuoOps does not enforce anything based on this.
            </p>
            <div className="flex gap-2">
              {([
                { value: "goods", label: "Goods", icon: "📦" },
                { value: "services", label: "Services", icon: "🛠️" },
                { value: "mixed", label: "Mixed", icon: "🔄" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBusinessType(opt.value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors ${
                    businessType === opt.value
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-brand-border bg-white text-brand-text hover:border-brand-primary/40"
                  }`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 4. Tax Registration Numbers ── */}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-text">
              4. Tax Registration
            </h3>
            <p className="mb-3 text-xs text-brand-textMuted">
              Optional. This helps your accountant when reviewing your reports.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-textMuted">
                  TIN (Tax ID Number)
                </label>
                <input
                  type="text"
                  placeholder="10-digit TIN"
                  maxLength={10}
                  value={tin}
                  onChange={(e) => setTin(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-textMuted/40 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              {isVatEnabled && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-textMuted">
                    VAT Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12345678AB"
                    maxLength={15}
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-textMuted/40 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Independent Verification (Mono) ── */}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-text">
              5. Independent Verification{" "}
              <span className="font-normal text-brand-textMuted">(optional, small fee)</span>
            </h3>
            <p className="mb-3 text-xs text-brand-textMuted">
              Confirm your TIN/CAC against the official registry via Mono — this is a stronger,
              independently-verified signal than the self-declared fields above, and strengthens
              your Business Snapshot if you share it with a bank or lender.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* TIN verification */}
              <div className="rounded-lg border border-brand-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-brand-textMuted">TIN</span>
                  {profile?.registration.tin_verified ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      ✅ Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-brand-textMuted">₦50 to verify</span>
                  )}
                </div>
                <Button
                  onClick={() => verifyTinMutation.mutate()}
                  disabled={
                    !profile?.registration.tin ||
                    profile.registration.tin_verified ||
                    verifyTinMutation.isPending
                  }
                  variant="secondary"
                  className="w-full text-xs"
                >
                  {!profile?.registration.tin
                    ? "Save a TIN first"
                    : profile.registration.tin_verified
                      ? "Verified"
                      : verifyTinMutation.isPending
                        ? "Verifying…"
                        : "Verify TIN"}
                </Button>
              </div>

              {/* CAC/RC verification */}
              <div className="rounded-lg border border-brand-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-brand-textMuted">CAC / RC Number</span>
                  {profile?.registration.cac_verified ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      ✅ Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-brand-textMuted">₦10 to verify</span>
                  )}
                </div>
                {profile?.registration.cac_verified ? (
                  <p className="text-xs text-brand-text">
                    {profile.registration.cac_registered_name}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. RC1234567"
                      value={rcNumber}
                      onChange={(e) => setRcNumber(e.target.value.toUpperCase())}
                      className="min-w-0 flex-1 rounded-lg border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-text placeholder:text-brand-textMuted/40 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <Button
                      onClick={() => verifyCacMutation.mutate()}
                      disabled={!rcNumber || verifyCacMutation.isPending}
                      variant="secondary"
                      className="shrink-0 text-xs"
                    >
                      {verifyCacMutation.isPending ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer: Save + Disclaimer ── */}
          <div className="flex flex-col gap-3 border-t border-brand-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-brand-textMuted italic leading-relaxed max-w-lg">
              SuoOps calculates VAT based on what your business says about itself — not what the law assumes about you.
              This profile drives internal calculations only. It does not file taxes or register you with FIRS.
            </p>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !hasChanges}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
