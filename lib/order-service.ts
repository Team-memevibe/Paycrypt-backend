// backend/lib/order-service.ts
import axios from "axios";
import { Order } from "../models/order"; 


export async function processAirtimePurchase(data: any) {
  const order = await Order.create({ ...data, service: "airtime", status: "processing" });
  // Call VTpass here later
  return { success: true, order };
}

export async function handleDataOrder(data: any) {
  const order = await Order.create({ ...data, service: "data", status: "processing" });
  // Call VTpass for data here later
  return { success: true, order };
}

export async function processVTPassPurchase(data: any) {
  const order = await Order.create({ ...data, service: "tv", status: "processing" });
  // Call VTpass for TV here later
  return { success: true, order };
}
