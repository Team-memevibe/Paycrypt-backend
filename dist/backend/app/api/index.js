"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const route_1 = __importDefault(require("./airtime/route"));
const route_2 = __importDefault(require("./data/route"));
const route_3 = __importDefault(require("./tv/route"));
require("@/db/index");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/airtime", route_1.default);
app.use("/api/data", route_2.default);
app.use("/api/tv", route_3.default);
app.get("/", (_req, res) => res.send("API is up ✅"));
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
