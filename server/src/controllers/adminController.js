import fs from "fs";
import { Parser } from "@json2csv/plainjs";
import { ActivityType, LeadPhase, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { parseDay, startOfDay, endOfDay } from "../utils/dates.js";
import { buildLead, parseOptionalDate, readLeadRows } from "../services/leadImport.js";

const quotaSchema = z.object({
  salesUserId: z.string(),
  date: z.string(),
  callsTarget: z.coerce.number().int().min(0),
  leadsTarget: z.coerce.number().int().min(0)
});

const leadSchema = z.object({
  fullName: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().optional().default(""),
  phase: z.nativeEnum(LeadPhase).optional().default(LeadPhase.NEW),
  assignedToId: z.string().nullable().optional(),
  appointmentDate: z.string().nullable().optional(),
  businessName: z.string().optional().default(""),
  licenceNumber: z.string().optional().default(""),
  businessRegion: z.string().optional().default(""),
  businessZone: z.string().optional().default(""),
  businessWoreda: z.string().optional().default(""),
  businessKebele: z.string().optional().default(""),
  houseNumber: z.string().optional().default(""),
  businessTelephone: z.string().optional().default("")
});

const assignSchema = z.object({
  salesUserId: z.string().nullable()
});

export async function adminSummary(req, res, next) {
  try {
    const today = startOfDay();
    const [leads, salesUsers, won, lost, followUps, unassigned, salesCreatedToday] = await Promise.all([
      prisma.lead.count(),
      prisma.user.count({ where: { role: Role.SALES } }),
      prisma.lead.count({ where: { phase: LeadPhase.CLOSED_WON } }),
      prisma.lead.count({ where: { phase: LeadPhase.CLOSED_LOST } }),
      prisma.lead.count({ where: { phase: LeadPhase.FOLLOW_UP } }),
      prisma.lead.count({ where: { assignedToId: null } }),
      prisma.lead.count({
        where: {
          createdAt: { gte: today },
          createdBy: { role: Role.SALES }
        }
      })
    ]);

    res.json({ leads, salesUsers, won, lost, followUps, unassigned, salesCreatedToday });
  } catch (error) {
    next(error);
  }
}

export async function listSalesUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: Role.SALES },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function listLeads(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();
    const phase = String(req.query.phase || "").trim();
    const assignedToId = String(req.query.assignedToId || "").trim();
    const createdById = String(req.query.createdById || "").trim();

    const where = {
      ...(phase && phase !== "ALL" ? { phase } : {}),
      ...(assignedToId === "UNASSIGNED" ? { assignedToId: null } : assignedToId ? { assignedToId } : {}),
      ...(createdById ? { createdById } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { phoneNumber: { contains: search } },
              { email: { contains: search } },
              { businessName: { contains: search } },
              { licenceNumber: { contains: search } },
              { businessRegion: { contains: search } },
              { businessWoreda: { contains: search } }
            ]
          }
        : {})
    };

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json({ leads });
  } catch (error) {
    next(error);
  }
}

export async function uploadLeads(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV or Excel file is required" });

    const salesUsers = await prisma.user.findMany({ where: { role: Role.SALES }, select: { id: true } });
    const rows = await readLeadRows(req.file);

    const leads = rows
      .map((row, index) => {
        const assignedToId = salesUsers.length ? salesUsers[index % salesUsers.length].id : null;
        return buildLead(row, { assignedToId, createdById: req.user.id });
      })
      .filter(Boolean);

    if (!leads.length) return res.status(400).json({ message: "No valid leads found. Required fields: business/name and phone." });

    await prisma.lead.createMany({ data: leads });
    fs.unlink(req.file.path, () => {});
    res.status(201).json({ imported: leads.length });
  } catch (error) {
    next(error);
  }
}

export async function createLead(req, res, next) {
  try {
    const data = leadSchema.parse(req.body);
    const lead = await prisma.lead.create({
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        phase: data.phase,
        assignedToId: data.assignedToId || null,
        createdById: req.user.id,
        appointmentDate: parseOptionalDate(data.appointmentDate),
        businessName: data.businessName,
        licenceNumber: data.licenceNumber,
        businessRegion: data.businessRegion,
        businessZone: data.businessZone,
        businessWoreda: data.businessWoreda,
        businessKebele: data.businessKebele,
        houseNumber: data.houseNumber,
        businessTelephone: data.businessTelephone
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, leadId: lead.id, type: ActivityType.LEAD_CREATED }
    });

    res.status(201).json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function assignLead(req, res, next) {
  try {
    const data = assignSchema.parse(req.body);
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedToId: data.salesUserId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        leadId: lead.id,
        type: ActivityType.LEAD_ASSIGNED,
        metadata: JSON.stringify({ assignedToId: data.salesUserId })
      }
    });

    res.json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function upsertQuota(req, res, next) {
  try {
    const data = quotaSchema.parse(req.body);
    const date = parseDay(data.date);

    const quota = await prisma.quota.upsert({
      where: { salesUserId_date: { salesUserId: data.salesUserId, date } },
      update: { callsTarget: data.callsTarget, leadsTarget: data.leadsTarget },
      create: { salesUserId: data.salesUserId, date, callsTarget: data.callsTarget, leadsTarget: data.leadsTarget },
      include: { salesUser: { select: { id: true, name: true, email: true } } }
    });

    res.json({ quota });
  } catch (error) {
    next(error);
  }
}

export async function listQuotas(req, res, next) {
  try {
    const date = parseDay(req.query.date);
    const quotas = await prisma.quota.findMany({
      where: { date },
      include: { salesUser: { select: { id: true, name: true, email: true } } },
      orderBy: { salesUser: { name: "asc" } }
    });
    res.json({ quotas });
  } catch (error) {
    next(error);
  }
}

export async function exportReport(req, res, next) {
  try {
    const from = req.query.from ? startOfDay(new Date(req.query.from)) : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay();

    const users = await prisma.user.findMany({
      where: { role: Role.SALES },
      include: {
        quotas: { where: { date: { gte: from, lte: to } } },
        notes: { where: { createdAt: { gte: from, lte: to } } },
        activities: { where: { createdAt: { gte: from, lte: to } } },
        assignedLeads: true,
        createdLeads: { where: { createdAt: { gte: from, lte: to } } }
      },
      orderBy: { name: "asc" }
    });

    const rows = users.map((user) => ({
      agent: user.name,
      email: user.email,
      assignedLeads: user.assignedLeads.length,
      createdLeads: user.createdLeads.length,
      callNotes: user.notes.length,
      activities: user.activities.length,
      quotaDays: user.quotas.length,
      totalCallTarget: user.quotas.reduce((sum, quota) => sum + quota.callsTarget, 0),
      totalLeadTarget: user.quotas.reduce((sum, quota) => sum + quota.leadsTarget, 0)
    }));

    const parser = new Parser();
    const csvOutput = parser.parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment(`agent-performance-${Date.now()}.csv`);
    res.send(csvOutput);
  } catch (error) {
    next(error);
  }
}
