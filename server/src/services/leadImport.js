import fs from "fs";
import csv from "csv-parser";
import XLSX from "xlsx";
import { LeadPhase } from "@prisma/client";

const phaseValues = Object.values(LeadPhase);

export function normalizeHeader(row, names) {
  const found = Object.keys(row).find((key) => names.includes(key.trim().toLowerCase()));
  return found ? String(row[found] || "").trim() : "";
}

function normalizeExact(row, name) {
  return normalizeHeader(row, [name.toLowerCase()]);
}

export function parseOptionalDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function readLeadRows(file) {
  const extension = file.originalname.toLowerCase().split(".").pop();
  if (["xlsx", "xls"].includes(extension)) {
    const workbook = XLSX.readFile(file.path, { cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  }

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(file.path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  return rows;
}

export function buildLead(row, { assignedToId = null, createdById = null } = {}) {
  const managerName = [normalizeExact(row, "ManagerFName"), normalizeExact(row, "ManagerMName"), normalizeExact(row, "ManagerLName")].filter(Boolean).join(" ");
  const businessName = normalizeExact(row, "BusinessName");
  const fullName = normalizeHeader(row, ["full name", "fullname", "name"]) || businessName || managerName;
  const phoneNumber = normalizeHeader(row, ["phone number", "phone", "mobile", "mangerphone", "managerphone"]) || normalizeExact(row, "BussinessTelephone");
  const email = normalizeHeader(row, ["email", "email address"]);
  const phase = normalizeHeader(row, ["phase", "status"]).toUpperCase().replace(/[-\s]/g, "_");

  if (!fullName || !phoneNumber) return null;

  return {
    fullName,
    phoneNumber,
    email,
    assignedToId,
    createdById,
    phase: phaseValues.includes(phase) ? phase : LeadPhase.NEW,
    appointmentDate: parseOptionalDate(normalizeHeader(row, ["appointment date", "appointmentdate", "appointment"])),
    dateRegistered: parseOptionalDate(normalizeExact(row, "DateRegistered")),
    legalStatusNameEng: normalizeExact(row, "LegalStatusNameEng"),
    legalStatusNameAmh: normalizeExact(row, "LegalStatusNameAmh"),
    status: normalizeExact(row, "Status"),
    licenceNumber: normalizeExact(row, "LicenceNumber"),
    renewedTo: parseOptionalDate(normalizeExact(row, "RenewedTo")),
    siteId: normalizeExact(row, "SiteID"),
    businessName,
    businessNameAmharic: normalizeExact(row, "BusinessNameAmharic"),
    managerFName: normalizeExact(row, "ManagerFName"),
    managerMName: normalizeExact(row, "ManagerMName"),
    managerLName: normalizeExact(row, "ManagerLName"),
    description: normalizeExact(row, "description"),
    code: normalizeExact(row, "Code"),
    englishDescription: normalizeExact(row, "EnglishDescription"),
    amDescription: normalizeExact(row, "Amdiscrption"),
    subGroup: normalizeExact(row, "SubGroup"),
    subGroupAm: normalizeExact(row, "SubGroupAM"),
    subGroupEn: normalizeExact(row, "SubGroupEN"),
    businessRegion: normalizeExact(row, "BussinessdescriptionRegion"),
    businessZone: normalizeExact(row, "BussinessDescriptionZones"),
    businessWoreda: normalizeExact(row, "BussinessDescriptionWoredas"),
    businessKebele: normalizeExact(row, "BussinessAmharickebeles"),
    houseNumber: normalizeExact(row, "HousNum"),
    businessTelephone: normalizeExact(row, "BussinessTelephone")
  };
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function duplicateKey(lead) {
  const phone = normalizeKey(lead.phoneNumber);
  const license = normalizeKey(lead.licenceNumber);
  return { phone, license };
}

export async function findDuplicateLead(prisma, { phoneNumber, licenceNumber, excludeId } = {}) {
  const phone = String(phoneNumber || "").trim();
  const license = String(licenceNumber || "").trim();
  if (!phone && !license) return null;

  return prisma.lead.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(phone ? [{ phoneNumber: phone }] : []),
        ...(license ? [{ licenceNumber: license }] : [])
      ]
    },
    select: { id: true, fullName: true, phoneNumber: true, licenceNumber: true }
  });
}

export async function prepareLeadImport(prisma, candidates) {
  const skipped = [];
  const validCandidates = [];
  const filePhones = new Set();
  const fileLicenses = new Set();

  for (const candidate of candidates) {
    if (!candidate.lead) {
      skipped.push({ row: candidate.rowNumber, reason: "Missing business/name or phone" });
      continue;
    }

    const { phone, license } = duplicateKey(candidate.lead);
    if ((phone && filePhones.has(phone)) || (license && fileLicenses.has(license))) {
      skipped.push({ row: candidate.rowNumber, reason: "Duplicate inside uploaded file", lead: candidate.lead.fullName });
      continue;
    }

    if (phone) filePhones.add(phone);
    if (license) fileLicenses.add(license);
    validCandidates.push(candidate);
  }

  const phones = [...new Set(validCandidates.map((candidate) => candidate.lead.phoneNumber).filter(Boolean))];
  const licenses = [...new Set(validCandidates.map((candidate) => candidate.lead.licenceNumber).filter(Boolean))];
  const existing = phones.length || licenses.length
    ? await prisma.lead.findMany({
        where: {
          OR: [
            ...(phones.length ? [{ phoneNumber: { in: phones } }] : []),
            ...(licenses.length ? [{ licenceNumber: { in: licenses } }] : [])
          ]
        },
        select: { phoneNumber: true, licenceNumber: true }
      })
    : [];

  const existingPhones = new Set(existing.map((lead) => normalizeKey(lead.phoneNumber)).filter(Boolean));
  const existingLicenses = new Set(existing.map((lead) => normalizeKey(lead.licenceNumber)).filter(Boolean));
  const leads = [];

  for (const candidate of validCandidates) {
    const { phone, license } = duplicateKey(candidate.lead);
    if ((phone && existingPhones.has(phone)) || (license && existingLicenses.has(license))) {
      skipped.push({ row: candidate.rowNumber, reason: "Already exists in CRM", lead: candidate.lead.fullName });
      continue;
    }
    leads.push(candidate.lead);
  }

  return { leads, skipped };
}
