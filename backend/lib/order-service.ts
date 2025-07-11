import axios from "axios";

const BASE_URL = "https://vtpass.com/api/pay";

export async function processVTPassPurchase({
  phone,
  serviceID,
  variation_code,
  amount,
  serviceType,
}: {
  phone: string;
  serviceID: string;
  variation_code?: string;
  amount?: number;
  serviceType: "airtime" | "data" | "tv";
}) {
  const request_id = generateRequestId();

  const payload: any = {
    request_id,
    serviceID,
    phone,
  };

  if (serviceType === "airtime" && amount) {
    payload.amount = amount;
  } else if ((serviceType === "data" || serviceType === "tv") && variation_code) {
    payload.variation_code = variation_code;
  } else {
    return { error: "Missing amount or variation_code" };
  }

  try {
    const res = await axios.post(BASE_URL, payload, {
      headers: {
        "api-key": process.env.VT_API_KEY!,
        "secret-key": process.env.VT_SECRET_KEY!,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err: any) {
    return { error: err.response?.data || err.message };
  }
}

function generateRequestId(suffix = "") {
  const now = new Date();
  return (
    now.toISOString().replace(/\D/g, "").slice(0, 12) +
    (suffix || Math.random().toString(36).substring(2, 10))
  );
}
