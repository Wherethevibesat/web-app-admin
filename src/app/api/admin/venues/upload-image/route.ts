import { NextResponse } from "next/server";
import { uploadAdminVenueImage } from "@/lib/admin/venue-image-upload";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  try {
    const url = await uploadAdminVenueImage(file, auth.user!.id);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
