"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  X,
  Star,
  Trash2,
  AlertCircle,
  Filter,
  Pin,
  Send,
} from "lucide-react";
import { useAdminAuth } from "../layout";

interface Testimonial {
  id: number;
  user_id: number;
  user_name: string;
  business_name: string | null;
  email: string | null;
  text: string;
  rating: number;
  approved: boolean;
  featured: boolean;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "approved";

export default function TestimonialsPage() {
  const { token } = useAdminAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isSending, setIsSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";

  const fetchTestimonials = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${apiUrl}/admin/testimonials?status=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load testimonials");
      const data = await res.json();
      setTestimonials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [token, filter, apiUrl]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  async function updateTestimonial(
    id: number,
    updates: { approved?: boolean; featured?: boolean }
  ) {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteTestimonial(id: number) {
    if (!token || !confirm("Delete this testimonial?")) return;
    try {
      const res = await fetch(`${apiUrl}/admin/testimonials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const pendingCount = testimonials.filter((t) => !t.approved).length;
  const approvedCount = testimonials.filter((t) => t.approved).length;

  async function sendRequests() {
    if (!token || !confirm("Send feedback request emails to all eligible users?")) return;
    setIsSending(true);
    setSendMessage("");
    try {
      const res = await fetch(`${apiUrl}/admin/testimonials/send-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to send requests");
      const data = await res.json();
      setSendMessage(data.message || "Feedback emails queued!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send requests");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Testimonials</h1>
        <p className="text-slate-500">
          Review and approve user feedback for the landing page
        </p>
      </div>

      {/* Send Requests + Stats + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={sendRequests}
            disabled={isSending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send Requests"}
          </button>
          <span className="text-sm text-slate-500">
            {pendingCount} pending · {approvedCount} approved
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {(["all", "pending", "approved"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {sendMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {sendMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">No testimonials yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border bg-white p-5 shadow-xs ${
                t.approved
                  ? "border-emerald-200"
                  : "border-amber-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User info */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-900">
                      {t.user_name}
                    </span>
                    {t.business_name && (
                      <span className="text-slate-500">
                        · {t.business_name}
                      </span>
                    )}
                    {t.email && (
                      <span className="text-slate-400 text-xs">{t.email}</span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="mt-1 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= t.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  {/* Meta */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span>
                      {new Date(t.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {t.approved && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 font-medium">
                        Approved
                      </span>
                    )}
                    {t.featured && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-4 flex items-center gap-1">
                  {!t.approved ? (
                    <button
                      onClick={() => updateTestimonial(t.id, { approved: true })}
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 transition"
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateTestimonial(t.id, { approved: false })
                      }
                      className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-100 transition"
                      title="Unapprove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      updateTestimonial(t.id, { featured: !t.featured })
                    }
                    className={`rounded-lg p-2 transition ${
                      t.featured
                        ? "bg-purple-100 text-purple-600"
                        : "bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-500"
                    }`}
                    title={t.featured ? "Unfeature" : "Feature"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTestimonial(t.id)}
                    className="rounded-lg bg-red-50 p-2 text-red-400 hover:bg-red-100 hover:text-red-600 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
