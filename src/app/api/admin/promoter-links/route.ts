import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  addPromoterVenueLink,
  ensurePromoterAccount,
  ensurePromoterProfile,
  findUserByEmail,
  getPromoterLinkById,
  getPromoterEventForEmail,
} from "@/lib/admin/promoters";
import { getVenue } from "@/lib/admin/venues";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyPromoterVenueLink,
  notifyPromoterWelcome,
  notifyPromoterEventReview,
} from "@/lib/email/promoter-notifications";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    promoterId?: string;
    venueId?: string;
    status?: "pending" | "approved";
  };

  const venueId = body.venueId?.trim();
  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  const venue = await getVenue(venueId);
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  let promoterId = body.promoterId?.trim() || "";
  const email = body.email?.trim().toLowerCase();

  try {
    if (!promoterId && email) {
      promoterId = await ensurePromoterAccount(email, body.name?.trim() ?? "");
    } else if (promoterId && email) {
      const user = await findUserByEmail(email);
      if (user && user.id !== promoterId) {
        return NextResponse.json({ error: "Email does not match selected promoter" }, { status: 400 });
      }
      if (user) {
        await ensurePromoterProfile(user.id, user.name, user.email);
      }
    } else if (promoterId) {
      const admin = createAdminClient();
      const { data: user } = await admin
        .from("users")
        .select("id, name, email, role")
        .eq("id", promoterId)
        .maybeSingle();
      if (!user) {
        return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
      }
      if (user.role !== "promoter") {
        await ensurePromoterProfile(user.id, user.name, user.email);
      }
    } else {
      return NextResponse.json(
        { error: "Provide promoter email or select an existing promoter" },
        { status: 400 },
      );
    }

    const status = body.status === "pending" ? "pending" : "approved";
    await addPromoterVenueLink({
      promoterId,
      venueId,
      reviewerId: auth.user!.id,
      reviewerRole: "admin",
      status,
    });

    await logAdminAction({
      adminId: auth.user!.id,
      action: "promoter_link.create",
      entityType: "promoter_venue_link",
      entityId: promoterId,
      payload: { venueId, status, email },
    });

    const admin = createAdminClient();
    const { data: promoterUser } = await admin
      .from("users")
      .select("name, email")
      .eq("id", promoterId)
      .maybeSingle();

    if (promoterUser?.email) {
      if (email && status === "approved") {
        notifyPromoterWelcome({
          email: promoterUser.email,
          name: promoterUser.name,
          venueName: venue.name,
        });
      } else if (status === "approved") {
        notifyPromoterVenueLink({
          promoterEmail: promoterUser.email,
          promoterName: promoterUser.name,
          venueName: venue.name,
          approved: true,
        });
      }
    }

    return NextResponse.json({ ok: true, promoterId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add promoter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
