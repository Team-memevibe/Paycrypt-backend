const axios = require("axios");
const { Order } = require("../models/order");

async function processAirtimePurchase(data) {
  const order = await Order.create({ ...data, service: "airtime", status: "pending" });
  // TODO: call VTpass API
  order.status = "success";
  await order.save();
  return order;
}

async function handleDataOrder(data) {
  const order = await Order.create({ ...data, service: "data", status: "pending" });
  // TODO: call VTpass API
  order.status = "success";
  await order.save();
  return order;
}

async function processVTPassPurchase(data) {
  const order = await Order.create({ ...data, service: "tv", status: "pending" });
  // TODO: call VTpass API
  order.status = "success";
  await order.save();
  return order;
}

module.exports = { processAirtimePurchase, handleDataOrder, processVTPassPurchase };
