"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAdminAuth } from "../../layout";

interface Ticket {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: "open", label: "Open", color: "yellow" },
  { value: "in_progress", label: "In Progress", color: "blue" },
  { value: "waiting", label: "Waiting on Customer", color: "purple" },
  { value: "resolved", label: "Resolved", color: "green" },
  { value: "closed", label: "Closed", color: "slate" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function TicketDetailPage() {
  const { token } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [response, setResponse] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      if (!token || !ticketId) return;

      setIsLoading(true);
      setError("");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(
          `${apiUrl}/support/admin/tickets/${ticketId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          if (res.status === 404) throw new Error("Ticket not found");
          throw new Error("Failed to fetch ticket");
        }

        const data = await res.json();
        setTicket(data);
        setStatus(data.status);
        setPriority(data.priority);
        setResponse(data.response || "");
        setInternalNotes(data.internal_notes || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ticket");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTicket();
  }, [token, ticketId]);

  async function handleSave() {
    if (!token || !ticketId) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(
        `${apiUrl}/support/admin/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            priority,
            response: response || null,
            internal_notes: internalNotes || null,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update ticket");

      const updated = await res.json();
      setTicket(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <Link
          href="/admin/tickets"
          className="text-emerald-600 hover:text-emerald-700 font-medium"
        >
          ← Back to Tickets
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Ticket #{ticket.id}
          </h1>
          <p className="text-slate-500">{ticket.subject}</p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer message */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Customer Message</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {ticket.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ticket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {ticket.message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Response */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Your Response
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                This will be sent to the customer via email
              </p>
            </div>
            <div className="p-6">
              {ticket.responded_at && ticket.response && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-700 mb-1">
                    <strong>Last response sent:</strong>{" "}
                    {new Date(ticket.responded_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">
                    {ticket.response}
                  </p>
                </div>
              )}
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response to the customer..."
                rows={6}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Internal notes */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Internal Notes</h2>
              <p className="text-sm text-slate-500 mt-1">
                Private notes, not visible to customer
              </p>
            </div>
            <div className="p-6">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-yellow-50"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket details */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Ticket Details</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <p className="text-sm text-slate-600 capitalize px-3 py-2 bg-slate-50 rounded-lg">
                  {ticket.category}
                </p>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Customer</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {ticket.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <a
                  href={`mailto:${ticket.email}`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {ticket.email}
                </a>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Timeline</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <span className="text-slate-500">Created:</span>{" "}
                  <span className="text-slate-700">
                    {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <span className="text-slate-500">Updated:</span>{" "}
                  <span className="text-slate-700">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {ticket.responded_at && (
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <div>
                    <span className="text-slate-500">Responded:</span>{" "}
                    <span className="text-slate-700">
                      {new Date(ticket.responded_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
