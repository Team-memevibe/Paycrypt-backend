import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import airtimeRoutes from "./api/airtime/route";
import dataRoutes from "./api/data/route";
import tvRoutes from "./api/tv/route";

import "../db/index";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/airtime", airtimeRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/tv", tvRoutes);

app.get("/", (_req, res) => res.send("API is up ✅"));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});