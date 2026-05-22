import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getVenue } from "@/lib/admin/venues";
import { getVerificationSignedUrl } from "@/lib/admin/stripe";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { venueId } = await params;
  const venue = await getVenue(venueId);
  if (!venue?.verification_document_path) {
    return NextResponse.json({ error: "No document on file" }, { status: 404 });
  }

  const url = await getVerificationSignedUrl(venue.verification_document_path);
  if (!url) {
    return NextResponse.json({ error: "Could not generate link" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
