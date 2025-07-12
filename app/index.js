// app/index.js OR .mjs
import dotenv from "dotenv";
dotenv.config();
import express from "express";



// routers
const airtimeRouter = require("./app/api/airtime/route");
const dataRouter    = require("./app/api/data/route");
const tvRouter      = require("./app/api/tv/route");

// connect database
require("./db/index")();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/airtime", airtimeRouter);
app.use("/api/data",    dataRouter);
app.use("/api/tv",      tvRouter);

app.get("/", (_req, res) => res.send("Backend API is live 🚀"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
