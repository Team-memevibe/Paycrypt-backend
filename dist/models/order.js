"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const OrderSchema = new mongoose_1.default.Schema({
    userId: String,
    service: String,
    amount: Number,
    status: String,
    reference: String,
    metadata: Object,
}, { timestamps: true });
exports.Order = mongoose_1.default.model("Order", OrderSchema);
