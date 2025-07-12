"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/app/api/data/route.ts
const express_1 = require("express");
const order_service_1 = require("../../../lib/order-service");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const result = await (0, order_service_1.handleDataOrder)(req.body);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(500).json({ error: "Data order failed", details: err });
    }
});
exports.default = router;
