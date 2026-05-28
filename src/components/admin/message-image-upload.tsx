"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

async function uploadMessageImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/messages/upload-image", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

export function MessageImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMessageImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Message image (optional)</Label>
        <p className="text-xs text-wtva-muted">
          Shown in email and in-app notifications. JPG, PNG, or WebP, max 5 MB.
        </p>
      </div>

      {value ? (
        <div className="relative aspect-[2/1] max-h-40 w-full overflow-hidden rounded-lg border border-wtva-dark-300">
          <Image src={value} alt="Message preview" fill className="object-cover" unoptimized />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </Button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sm text-wtva-muted underline"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div>
        <Label htmlFor="message_image_url" className="text-xs text-wtva-muted">
          Or paste image URL
        </Label>
        <Input
          id="message_image_url"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
