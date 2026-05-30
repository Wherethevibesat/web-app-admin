"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

async function uploadVenueImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/venues/upload-image", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

type VenueImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

export function VenueImageUpload({ value, onChange }: VenueImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadVenueImage(file);
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
        <Label>Venue photo</Label>
        <p className="text-xs text-wtva-muted">
          Cover image shown on venue cards and detail pages (JPG, PNG, or WebP, max 5 MB).
        </p>
      </div>

      {value ? (
        <div className="relative aspect-[21/9] max-h-48 w-full overflow-hidden rounded-lg border border-wtva-dark-300">
          <Image src={value} alt="Venue preview" fill className="object-cover" unoptimized />
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
          {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
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
        <Label htmlFor="image_url" className="text-xs text-wtva-muted">
          Or paste image URL
        </Label>
        <Input
          id="image_url"
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
