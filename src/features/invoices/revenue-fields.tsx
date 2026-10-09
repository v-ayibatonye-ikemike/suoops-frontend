interface RevenueFieldsProps {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onCustomerEmailChange: (value: string) => void;
}

export function RevenueFields({
  customerName,
  customerPhone,
  customerEmail,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerEmailChange,
}: RevenueFieldsProps) {
  const id = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 md:col-span-1">
        <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-medium text-brand-textMuted">Customer name</label>
        <input
          id={`${id}-name`}
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          required
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="mb-1 block text-xs font-medium text-brand-textMuted">Customer phone</label>
        <input
          id={`${id}-phone`}
          value={customerPhone}
          onChange={(e) => onCustomerPhoneChange(e.target.value)}
          placeholder="Optional (e.g., +2348012345678 or +14155551234)"
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="mb-1 block text-xs font-medium text-brand-textMuted">Customer email</label>
        <input
          id={`${id}-email`}
          type="email"
          value={customerEmail}
          onChange={(e) => onCustomerEmailChange(e.target.value)}
          placeholder="Optional (e.g., customer@example.com)"
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
    </div>
  );
}
import { useId } from "react";
