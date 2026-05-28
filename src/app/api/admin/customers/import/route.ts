import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import {
  importCustomerContacts,
  parseCustomersCsv,
  previewCustomerImport,
} from "@/lib/admin/customers";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin("customers");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    action?: "preview" | "import";
    csvText?: string;
  };

  if (!body.csvText?.trim()) {
    return NextResponse.json({ error: "csvText is required" }, { status: 400 });
  }

  try {
    const rows = parseCustomersCsv(body.csvText);
    const preview = await previewCustomerImport(rows);
    if (body.action !== "import") {
      return NextResponse.json({ ok: true, preview });
    }

    const result = await importCustomerContacts(rows);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "customers.import",
      entityType: "customer_import_contacts",
      entityId: result.batchId,
      payload: {
        totalRows: rows.length,
        inserted: result.inserted,
      },
    });

    return NextResponse.json({ ok: true, preview, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
