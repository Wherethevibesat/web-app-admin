"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function StripeKeysForm({ initialPublishable }: { initialPublishable: string }) {
  const [key, setKey] = useState(initialPublishable);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/admin/stripe/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishable_key: key }),
    });
    setLoading(false);
    if (res.ok) setSaved(true);
    else alert("Failed to save");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <p className="text-sm text-wtva-muted">
        Store only the <strong>publishable</strong> key here. Put your Stripe{" "}
        <strong>secret</strong> key in Supabase Edge Function secrets — never in
        this app or the database.
      </p>
      <div>
        <Label htmlFor="pk">Publishable key (pk_…)</Label>
        <Input id="pk" value={key} onChange={(e) => setKey(e.target.value)} placeholder="pk_test_..." />
      </div>
      {saved && <p className="text-sm text-green-400">Saved.</p>}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save publishable key"}</Button>
    </form>
  );
}
