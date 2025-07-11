import { NextRequest, NextResponse } from "next/server";
import { processVTPassPurchase } from "../../../lib/order-service";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await processVTPassPurchase({
    ...body,
    serviceType: "tv", // tag as tv/cable
  });

  return NextResponse.json(response);
}
