import multer from "multer";
import { Router } from "express";
import {
  adminSummary,
  assignLead,
  createLead,
  createSalesUser,
  exportReport,
  listActivity,
  listLeads,
  listQuotas,
  listSalesUsers,
  uploadLeads,
  upsertQuota
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const upload = multer({ dest: "uploads/" });

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("ADMIN"));
adminRoutes.get("/summary", adminSummary);
adminRoutes.get("/sales-users", listSalesUsers);
adminRoutes.post("/sales-users", createSalesUser);
adminRoutes.get("/activity", listActivity);
adminRoutes.get("/leads", listLeads);
adminRoutes.post("/leads", createLead);
adminRoutes.post("/leads/upload", upload.single("file"), uploadLeads);
adminRoutes.patch("/leads/:id/assign", assignLead);
adminRoutes.get("/quotas", listQuotas);
adminRoutes.post("/quotas", upsertQuota);
adminRoutes.get("/reports/export", exportReport);
