import{ Router } from "express";
import { processVTPassPurchase } from "../../../lib/order-service";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await processVTPassPurchase(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TV subscription failed" });
  }
});

module.exports = router;
