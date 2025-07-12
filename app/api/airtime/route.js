import { Router } from "express";
import { processAirtimePurchase } from "../../../lib/order-service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await processAirtimePurchase(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Airtime processing failed" });
  }
});

module.exports = router;
