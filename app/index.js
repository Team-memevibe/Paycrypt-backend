// app/index.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";

// routers - converted to ES module imports
import airtimeRouter from "/opt/render/project/src/app/api/airtime/route.js";
import dataRouter from "/opt/render/project/src/app/api/data/route.js";
import tvRouter from "/opt/render/project/src/app/api/tv/route.js";

// connect database - converted to ES module import
import connectDB from "/opt/render/project/src/db/index.js";

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

app.use("/api/airtime", airtimeRouter);
app.use("/api/data", dataRouter);
app.use("/api/tv", tvRouter);

app.get("/", (_req, res) => res.send("Backend API is live 🚀"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));