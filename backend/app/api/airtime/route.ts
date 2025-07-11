import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  res.json({ message: "Airtime endpoint working!" });
});

export default router;
// This code defines a simple Express route for handling POST requests to the "/api/airtime" endpoint.