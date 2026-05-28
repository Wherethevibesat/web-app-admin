"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageImageUpload } from "@/components/admin/message-image-upload";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { MessageAudience, MessageChannel } from "@/lib/admin/messages";

export function MessageComposeForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<MessageAudience>("customer");
  const [channels, setChannels] = useState<MessageChannel[]>(["email", "in_app"]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/messages/audience-preview?audience=${audience}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRecipientCount(data.count ?? null);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  function toggleChannel(channel: MessageChannel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function submit(sendNow: boolean) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/messages/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        imageUrl: imageUrl.trim() || null,
        audience,
        channels,
        sendNow,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save campaign");
      return;
    }
    if (sendNow && data.sendResult) {
      setSuccess(
        `Campaign sent. Delivered ${data.sendResult.sent ?? 0}, failed ${data.sendResult.failed ?? 0}.`,
      );
    } else {
      setSuccess("Campaign saved as draft.");
    }
    setSubject("");
    setBody("");
    setImageUrl("");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-5">
      <h2 className="text-lg font-semibold">Broadcast message</h2>
      <p className="mt-1 text-sm text-wtva-muted">
        Send announcements to a role segment via email and/or in-app notification.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-wtva-muted">Subject</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-wtva-muted">Audience</span>
          <Select
            value={audience}
            onChange={(e) => setAudience(e.target.value as MessageAudience)}
            className="mt-1"
          >
            <option value="customer">Customers</option>
            <option value="driver">Drivers</option>
            <option value="venueOwner">Venue owners</option>
            <option value="promoter">Promoters</option>
          </Select>
        </label>
        <div className="text-sm">
          <span className="text-wtva-muted">Estimated recipients</span>
          <p className="mt-2 text-2xl font-bold">{recipientCount ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <span className="text-sm text-wtva-muted">Channels</span>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels.includes("email")}
                onChange={() => toggleChannel("email")}
              />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels.includes("in_app")}
                onChange={() => toggleChannel("in_app")}
              />
              In-app notification
            </label>
          </div>
        </div>
        <label className="block text-sm sm:col-span-2">
          <span className="text-wtva-muted">Message</span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="mt-1"
            required
          />
        </label>
        <div className="sm:col-span-2">
          <MessageImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={busy || !subject.trim() || !body.trim() || channels.length === 0}
          onClick={() => submit(true)}
        >
          {busy ? "Sending..." : "Send now"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !subject.trim() || !body.trim() || channels.length === 0}
          onClick={() => submit(false)}
        >
          Save draft
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
    </div>
  );
}
