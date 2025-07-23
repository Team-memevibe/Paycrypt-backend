import Order from "@/models/order";
import dbConnect from "@/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userAddress = searchParams.get("userAddress");

  if (!userAddress) {
    return Response.json({ error: "userAddress is required" }, { status: 400 });
  }

  try {
    await dbConnect(); // Ensure DB is connected

    const orders = await Order.find({ userAddress: userAddress.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(100);

    return Response.json({ success: true, orders });
  } catch (err) {
    console.error("History route error:", err);
    return Response.json({ error: "Failed to fetch transaction history." }, { status: 500 });
  }
}
