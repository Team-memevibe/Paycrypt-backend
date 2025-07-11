import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import airtimeRoute from "./airtime/route";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/airtime", airtimeRoute);

app.get("/", (_req, res) => res.send("Backend is running 🚀"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
