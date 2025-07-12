import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import airtimeRouter from "./api/airtime/route";
import dataRouter    from "./api/data/route";
import tvRouter      from "./api/tv/route";

import "./db/index";   // connects to MongoDB

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/airtime", airtimeRouter);
app.use("/api/data", dataRouter);
app.use("/api/tv", tvRouter);

app.get("/", (_req, res) => res.send("Backend API is live 🚀"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
