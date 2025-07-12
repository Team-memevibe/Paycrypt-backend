// backend/app/api/tv/route.ts
import { Router } from "express";
import { processVTPassPurchase } from "../../../lib/order-service";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await processVTPassPurchase(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "TV subscription failed", details: err });
  }
});

export default router;
