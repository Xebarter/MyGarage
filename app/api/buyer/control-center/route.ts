import {
  getBuyerControlCenter,
  getBuyerProfile,
  getBuyerServiceRequests,
  getBuyerProviderRatings,
} from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const [profile, controlCenter, serviceRequests, ratings] = await Promise.all([
      getBuyerProfile(customerId),
      getBuyerControlCenter(customerId),
      getBuyerServiceRequests(customerId),
      getBuyerProviderRatings(customerId),
    ]);

    if (!profile || !controlCenter) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      ...controlCenter,
      serviceRequests,
      ratings,
    });
  } catch (error) {
    console.error("[buyer/control-center]", error);
    return NextResponse.json({ error: "Failed to load control center" }, { status: 500 });
  }
}
