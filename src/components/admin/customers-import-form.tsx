"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Preview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingUsers: number;
  wouldImport: number;
  errors: Array<{ row: number; message: string }>;
};

export function CustomersImportForm() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function readFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  async function run(action: "preview" | "import") {
    if (!csvText.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/customers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, csvText }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Request failed");
      return;
    }
    setPreview(body.preview ?? null);
    if (action === "import") {
      setSuccess(
        `Imported ${body.inserted ?? 0} contacts into invite queue (batch ${body.batchId ?? "n/a"}).`,
      );
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-wtva-dark-300 bg-wtva-card p-5">
      <h2 className="text-lg font-semibold">Import customers (CSV)</h2>
      <p className="mt-1 text-sm text-wtva-muted">
        Upload CSV with at least `email` column. Optional `name` column.
      </p>

      <div className="mt-4 grid gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => readFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          placeholder={"email,name\njohn@example.com,John"}
          className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button disabled={busy || !csvText.trim()} onClick={() => run("preview")}>
          {busy ? "Working..." : "Validate preview"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !preview || preview.wouldImport === 0}
          onClick={() => run("import")}
        >
          Import valid rows
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}

      {preview && (
        <div className="mt-4 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400/40 p-4 text-sm">
          <p>Total rows: {preview.totalRows}</p>
          <p>Valid: {preview.validRows}</p>
          <p>Invalid: {preview.invalidRows}</p>
          <p>Duplicates in file: {preview.duplicateRows}</p>
          <p>Already existing users: {preview.existingUsers}</p>
          <p className="font-semibold">Would import: {preview.wouldImport}</p>
          {preview.errors.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 font-medium">Sample issues:</p>
              <ul className="list-disc pl-5 text-wtva-muted">
                {preview.errors.slice(0, 10).map((e, idx) => (
                  <li key={`${e.row}-${idx}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
