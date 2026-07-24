import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  upsertNightPackage,
  deleteNightPackage,
  setStopOfferStatus,
} from "@/lib/admin/night-packages";
import type { NightPackageFormData } from "@/lib/types/night-package";

export async function POST(request: Request) {
  const auth = await requireAdmin("vip_packages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as NightPackageFormData & {
    action?: string;
    stopOfferId?: string;
    status?: "approved" | "rejected" | "archived";
  };

  try {
    if (body.action === "set_stop_status" && body.stopOfferId && body.status) {
      await setStopOfferStatus(body.stopOfferId, body.status);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "delete" && body.id) {
      await deleteNightPackage(body.id);
      return NextResponse.json({ ok: true });
    }
    const id = await upsertNightPackage(body);
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
