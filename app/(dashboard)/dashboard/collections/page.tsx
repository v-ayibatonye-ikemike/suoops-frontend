import { HandCoins } from "lucide-react";

import { CollectionsAssistant } from "@/features/collections/collections-assistant";

export default function CollectionsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-jade/10 p-2">
          <HandCoins className="h-6 w-6 text-brand-jade" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Get paid respectfully</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            SuoOps ranks overdue invoices and prepares respectful reminders. You edit and
            approve every message before anything is sent.
          </p>
        </div>
      </header>
      <CollectionsAssistant />
    </main>
  );
}
