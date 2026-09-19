import { NextRequest, NextResponse } from "next/server";
import { getConciergeShopHome, searchConciergeProducts } from "@/lib/concierge/catalog";

export async function GET() {
  try {
    return NextResponse.json(await getConciergeShopHome());
  } catch (error) {
    console.error("GET /api/buyer/concierge/products failed:", error);
    return NextResponse.json({ error: "Failed to load shop departments." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const browse = await searchConciergeProducts({
      query: typeof body.query === "string" ? body.query : "",
      category: typeof body.category === "string" ? body.category : undefined,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      offset: typeof body.offset === "number" ? body.offset : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      vehicleHint: typeof body.vehicleHint === "string" ? body.vehicleHint : undefined,
      sort:
        body.sort === "price_asc" || body.sort === "price_desc" || body.sort === "newest" || body.sort === "relevance"
          ? body.sort
          : "relevance",
    });
    return NextResponse.json(browse);
  } catch (error) {
    console.error("POST /api/buyer/concierge/products failed:", error);
    return NextResponse.json({ error: "Failed to search shop products." }, { status: 500 });
  }
}
