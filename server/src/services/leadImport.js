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
