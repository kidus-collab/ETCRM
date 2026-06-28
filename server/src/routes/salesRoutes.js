import { Router } from "express";
import multer from "multer";
import {
  addCallNote,
  createLead,
  dashboard,
  getLead,
  listMyLeads,
  updateAppointment,
  updateLeadPhase,
  uploadLeads
} from "../controllers/salesController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const upload = multer({ dest: "uploads/" });

export const salesRoutes = Router();

salesRoutes.use(requireAuth, requireRole("SALES"));
salesRoutes.get("/dashboard", dashboard);
salesRoutes.get("/leads", listMyLeads);
salesRoutes.post("/leads", createLead);
salesRoutes.post("/leads/upload", upload.single("file"), uploadLeads);
salesRoutes.get("/leads/:id", getLead);
salesRoutes.patch("/leads/:id/phase", updateLeadPhase);
salesRoutes.patch("/leads/:id/appointment", updateAppointment);
salesRoutes.post("/leads/:id/notes", addCallNote);
