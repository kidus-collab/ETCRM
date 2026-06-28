import { ActivityType, LeadPhase } from "@prisma/client";
import { z } from "zod";
import fs from "fs";
import { prisma } from "../config/db.js";
import { endOfDay, startOfDay } from "../utils/dates.js";
import { buildLead, parseOptionalDate, readLeadRows } from "../services/leadImport.js";

const phaseSchema = z.object({ phase: z.nativeEnum(LeadPhase) });
const noteSchema = z.object({ note: z.string().min(2) });
const appointmentSchema = z.object({
  appointmentDate: z.string().nullable().optional()
});
const leadSchema = z.object({
  fullName: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().optional().default(""),
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

async function ensureAssignedLead(leadId, userId) {
  return prisma.lead.findFirst({
    where: {
      id: leadId,
      OR: [
        { assignedToId: userId },
        { createdById: userId },
        { assignedToId: null, phase: LeadPhase.NEW }
      ]
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      callNotes: {
        include: { agent: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function dashboard(req, res, next) {
  try {
    const today = startOfDay();
    const tomorrow = endOfDay();
    const userId = req.user.id;

    const [quota, callsCompleted, processedLeadIds, todoLeads, phaseCounts] = await Promise.all([
      prisma.quota.findUnique({ where: { salesUserId_date: { salesUserId: userId, date: today } } }),
      prisma.callNote.count({ where: { agentId: userId, createdAt: { gte: today, lte: tomorrow } } }),
      prisma.activityLog.findMany({
        where: { userId, leadId: { not: null }, createdAt: { gte: today, lte: tomorrow } },
        distinct: ["leadId"],
        select: { leadId: true }
      }),
      prisma.lead.findMany({
        where: {
          OR: [
            { assignedToId: userId, followUpDate: { gte: today, lte: tomorrow } },
            { assignedToId: userId, appointmentDate: { gte: today, lte: tomorrow } },
            { assignedToId: userId, phase: LeadPhase.NEW },
            { createdById: userId, phase: LeadPhase.NEW },
            { assignedToId: null, phase: LeadPhase.NEW }
          ]
        },
        orderBy: [{ appointmentDate: "asc" }, { followUpDate: "asc" }, { createdAt: "desc" }]
      }),
      prisma.lead.groupBy({
        by: ["phase"],
        where: { assignedToId: userId },
        _count: { phase: true }
      })
    ]);

    res.json({
      quota: quota || { callsTarget: 0, leadsTarget: 0, date: today },
      progress: { callsCompleted, leadsProcessed: processedLeadIds.length },
      todoLeads,
      phaseCounts
    });
  } catch (error) {
    next(error);
  }
}

export async function listMyLeads(req, res, next) {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { assignedToId: req.user.id },
          { createdById: req.user.id },
          { assignedToId: null, phase: LeadPhase.NEW }
        ]
      },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ leads });
  } catch (error) {
    next(error);
  }
}

export async function getLead(req, res, next) {
  try {
    const lead = await ensureAssignedLead(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadPhase(req, res, next) {
  try {
    const lead = await ensureAssignedLead(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const data = phaseSchema.parse(req.body);
    const shouldClaim = lead.phase === LeadPhase.NEW && data.phase === LeadPhase.CONTACTED;
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { phase: data.phase, ...(shouldClaim ? { assignedToId: req.user.id } : {}) },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        callNotes: { include: { agent: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        leadId: lead.id,
        type: ActivityType.PHASE_CHANGE,
        metadata: JSON.stringify({ from: lead.phase, to: data.phase, claimedBy: shouldClaim ? req.user.id : null })
      }
    });

    res.json({ lead: updated });
  } catch (error) {
    next(error);
  }
}

export async function addCallNote(req, res, next) {
  try {
    const lead = await ensureAssignedLead(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const data = noteSchema.parse(req.body);
    const note = await prisma.callNote.create({
      data: { leadId: lead.id, agentId: req.user.id, note: data.note },
      include: { agent: { select: { id: true, name: true } } }
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, leadId: lead.id, type: ActivityType.CALL_NOTE }
    });

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
}

export async function updateAppointment(req, res, next) {
  try {
    const lead = await ensureAssignedLead(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const data = appointmentSchema.parse(req.body);
    const appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : null;
    if (appointmentDate && Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { appointmentDate },
      include: {
        assignedTo: { select: { id: true, name: true } },
        callNotes: { include: { agent: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        leadId: lead.id,
        type: ActivityType.APPOINTMENT_SET,
        metadata: JSON.stringify({ appointmentDate })
      }
    });

    res.json({ lead: updated });
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
        phase: LeadPhase.NEW,
        assignedToId: req.user.id,
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
        createdBy: { select: { id: true, name: true, role: true } },
        callNotes: { include: { agent: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }
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

export async function uploadLeads(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV or Excel file is required" });
    const rows = await readLeadRows(req.file);
    const leads = rows
      .map((row) => buildLead(row, { assignedToId: req.user.id, createdById: req.user.id }))
      .filter(Boolean);

    if (!leads.length) return res.status(400).json({ message: "No valid leads found. Required fields: business/name and phone." });

    await prisma.lead.createMany({ data: leads });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: ActivityType.LEAD_CREATED,
        metadata: JSON.stringify({ imported: leads.length })
      }
    });
    fs.unlink(req.file.path, () => {});
    res.status(201).json({ imported: leads.length });
  } catch (error) {
    next(error);
  }
}
