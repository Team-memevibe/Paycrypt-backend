// backend/app/api/data/route.ts
import { Router } from "express";
import { handleDataOrder } from "../../../lib/order-service";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await handleDataOrder(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Data order failed", details: err });
  }
});

export default router;