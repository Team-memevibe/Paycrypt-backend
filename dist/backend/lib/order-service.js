"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAirtimePurchase = processAirtimePurchase;
exports.handleDataOrder = handleDataOrder;
exports.processVTPassPurchase = processVTPassPurchase;
const order_1 = require("@/models/order");
async function processAirtimePurchase(data) {
    const order = await order_1.Order.create({ ...data, service: "airtime", status: "processing" });
    // Call VTpass here later
    return { success: true, order };
}
async function handleDataOrder(data) {
    const order = await order_1.Order.create({ ...data, service: "data", status: "processing" });
    // Call VTpass for data here later
    return { success: true, order };
}
async function processVTPassPurchase(data) {
    const order = await order_1.Order.create({ ...data, service: "tv", status: "processing" });
    // Call VTpass for TV here later
    return { success: true, order };
}
