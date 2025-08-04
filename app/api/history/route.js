import Order from "@/models/order";
import dbConnect from "@/db/index";
import { corsHandler, handlePreflight } from "@/lib/cors";

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function GET(req) {
  // Handle preflight if needed
  const preflightResponse = handlePreflight(req);
  if (preflightResponse) return preflightResponse;

  const { searchParams } = new URL(req.url);
  const userAddress = searchParams.get("userAddress");

  if (!userAddress) {
    return new Response(
      JSON.stringify({ error: "userAddress is required" }), 
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(req))
        }
      }
    );
  }

  try {
    await dbConnect(); // Ensure DB is connected

    const orders = await Order.find({ userAddress: userAddress.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(100);

    return new Response(
      JSON.stringify({ success: true, orders }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(req))
        }
      }
    );
  } catch (err) {
    console.error("History route error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch transaction history." }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(req))
        }
      }
    );
  }
}