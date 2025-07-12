// backend/app/api/airtime/route.ts
import { Router } from "express";
import { processAirtimePurchase } from "../../../lib/order-service";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await processAirtimePurchase(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Airtime processing failed", details: err });
  }
});

export default router;