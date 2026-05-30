"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function WithdrawForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), notes }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMessage(body.message ?? "Withdrawal requested.");
      router.refresh();
    } else {
      setMessage(body.error ?? "Failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <p className="text-sm text-wtva-muted">
        Transfers platform Stripe balance to your connected bank account. Requires{" "}
        <code className="text-foreground">STRIPE_SECRET_KEY</code> on the admin server.
      </p>
      <div>
        <Label htmlFor="amount">Amount ($)</Label>
        <Input id="amount" type="number" min={1} step={0.01} required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {message && <p className="text-sm text-wtva-muted">{message}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Submitting…" : "Request withdrawal"}</Button>
    </form>
  );
}
