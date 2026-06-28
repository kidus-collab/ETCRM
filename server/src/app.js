import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "node:url";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { salesRoutes } from "./routes/salesRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sales", salesRoutes);
app.use(errorHandler);
