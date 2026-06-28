import { useEffect, useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "../../api/client";
import { Badge } from "../../components/Badge";
import { StatCard } from "../../components/StatCard";
import { AppLayout } from "../../layouts/AppLayout";
import { formatDate, phaseOptions, todayInputValue } from "../../utils/format";

export function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [date, setDate] = useState(todayInputValue());
  const [selectedUser, setSelectedUser] = useState("");
  const [callsTarget, setCallsTarget] = useState(10);
  const [leadsTarget, setLeadsTarget] = useState(8);
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [newSalesUser, setNewSalesUser] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [leadFilters, setLeadFilters] = useState({
    search: "",
    phase: "ALL",
    assignedToId: "",
    createdById: ""
  });
  const [newLead, setNewLead] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    assignedToId: "",
    businessName: "",
    licenceNumber: "",
    businessRegion: "",
    businessWoreda: ""
  });

  const selectedQuota = useMemo(() => quotas.find((quota) => quota.salesUserId === selectedUser), [quotas, selectedUser]);

  async function loadData() {
    const [summaryRes, usersRes, leadsRes, quotasRes] = await Promise.all([
      api.get("/admin/summary"),
      api.get("/admin/sales-users"),
      api.get("/admin/leads", { params: leadFilters }),
      api.get("/admin/quotas", { params: { date } })
    ]);
    setSummary(summaryRes.data);
    setSalesUsers(usersRes.data.users);
    setLeads(leadsRes.data.leads);
    setQuotas(quotasRes.data.quotas);
    if (!selectedUser && usersRes.data.users[0]) setSelectedUser(usersRes.data.users[0].id);
  }

  useEffect(() => {
    loadData().catch((error) => setNotice(error.response?.data?.message || "Could not load dashboard"));
  }, [date, leadFilters]);

  useEffect(() => {
    if (selectedQuota) {
      setCallsTarget(selectedQuota.callsTarget);
      setLeadsTarget(selectedQuota.leadsTarget);
    }
  }, [selectedQuota]);

  async function saveQuota(event) {
    event.preventDefault();
    setNotice("");
    await api.post("/admin/quotas", { salesUserId: selectedUser, date, callsTarget, leadsTarget });
    setNotice("Quota saved.");
    await loadData();
  }

  async function uploadCsv(event) {
    event.preventDefault();
    if (!file) return setNotice("Choose a CSV file first.");
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/admin/leads/upload", form);
    const skippedText = data.skipped ? ` Skipped ${data.skipped}.` : "";
    const reasonText = data.skippedRows?.length ? ` First issue: row ${data.skippedRows[0].row} - ${data.skippedRows[0].reason}.` : "";
    setNotice(`Imported ${data.imported} leads.${skippedText}${reasonText}`);
    setFile(null);
    await loadData();
  }

  function updateNewLead(field, value) {
    setNewLead((current) => ({ ...current, [field]: value }));
  }

  function updateNewSalesUser(field, value) {
    setNewSalesUser((current) => ({ ...current, [field]: value }));
  }

  async function createSalesUser(event) {
    event.preventDefault();
    setNotice("");
    await api.post("/admin/sales-users", newSalesUser);
    setNotice("Sales user created.");
    setNewSalesUser({ name: "", email: "", password: "" });
    await loadData();
  }

  async function createLead(event) {
    event.preventDefault();
    setNotice("");
    try {
      await api.post("/admin/leads", { ...newLead, assignedToId: newLead.assignedToId || null });
      setNotice("Lead added.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not add lead.");
      return;
    }
    setNewLead({ fullName: "", phoneNumber: "", email: "", assignedToId: "", businessName: "", licenceNumber: "", businessRegion: "", businessWoreda: "" });
    await loadData();
  }

  async function assignLead(leadId, salesUserId) {
    await api.patch(`/admin/leads/${leadId}/assign`, { salesUserId: salesUserId || null });
    setNotice("Lead assignment updated.");
    await loadData();
  }

  function updateLeadFilter(field, value) {
    setLeadFilters((current) => ({ ...current, [field]: value }));
  }

  function exportReport() {
    const token = localStorage.getItem("etcrm_token");
    window.open(`http://127.0.0.1:4000/api/admin/reports/export?token=${token}`, "_blank");
  }

  async function downloadReport() {
    const response = await api.get("/admin/reports/export", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agent-performance.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout title="Admin Dashboard" subtitle="Manage leads, quotas, and performance exports.">
      <div className="grid gap-4 md:grid-cols-7">
        <StatCard label="Total Leads" value={summary?.leads ?? "-"} tone="forest" />
        <StatCard label="Sales Agents" value={summary?.salesUsers ?? "-"} />
        <StatCard label="Follow-Ups" value={summary?.followUps ?? "-"} />
        <StatCard label="Closed Won" value={summary?.won ?? "-"} tone="gold" />
        <StatCard label="Closed Lost" value={summary?.lost ?? "-"} tone="coral" />
        <StatCard label="Unassigned" value={summary?.unassigned ?? "-"} />
        <StatCard label="Sales Added Today" value={summary?.salesCreatedToday ?? "-"} />
      </div>

      {notice ? <div className="mt-5 rounded border border-line bg-white p-3 text-sm text-forest">{notice}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold">Bulk Upload Leads</h2>
          <p className="mt-1 text-sm text-neutral-500">Upload CSV or Excel. Real-estate columns are saved as extra lead fields.</p>
          <form onSubmit={uploadCsv} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <button className="inline-flex items-center justify-center gap-2 rounded bg-forest px-4 py-2 font-semibold text-white" type="submit">
              <Upload size={18} />
              Upload
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Reporting</h2>
              <p className="mt-1 text-sm text-neutral-500">Export agent performance metrics as CSV.</p>
            </div>
            <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 font-semibold hover:bg-neutral-50">
              <Download size={18} />
              Export
            </button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">Quota Management</h2>
        <form onSubmit={saveQuota} className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} className="rounded border border-line px-3 py-2">
            {salesUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="rounded border border-line px-3 py-2" />
          <input value={callsTarget} onChange={(event) => setCallsTarget(event.target.value)} type="number" min="0" className="rounded border border-line px-3 py-2" />
          <input value={leadsTarget} onChange={(event) => setLeadsTarget(event.target.value)} type="number" min="0" className="rounded border border-line px-3 py-2" />
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Save</button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">Create Sales User</h2>
        <form onSubmit={createSalesUser} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input value={newSalesUser.name} onChange={(event) => updateNewSalesUser("name", event.target.value)} required placeholder="Name" className="rounded border border-line px-3 py-2" />
          <input value={newSalesUser.email} onChange={(event) => updateNewSalesUser("email", event.target.value)} required type="email" placeholder="Email" className="rounded border border-line px-3 py-2" />
          <input value={newSalesUser.password} onChange={(event) => updateNewSalesUser("password", event.target.value)} required type="password" minLength="8" placeholder="Temporary password" className="rounded border border-line px-3 py-2" />
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Create</button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">Add Lead Manually</h2>
        <form onSubmit={createLead} className="mt-4 grid gap-3 md:grid-cols-4">
          <input value={newLead.fullName} onChange={(event) => updateNewLead("fullName", event.target.value)} required placeholder="Full name or business" className="rounded border border-line px-3 py-2" />
          <input value={newLead.phoneNumber} onChange={(event) => updateNewLead("phoneNumber", event.target.value)} required placeholder="Phone number" className="rounded border border-line px-3 py-2" />
          <input value={newLead.email} onChange={(event) => updateNewLead("email", event.target.value)} placeholder="Email" className="rounded border border-line px-3 py-2" />
          <select value={newLead.assignedToId} onChange={(event) => updateNewLead("assignedToId", event.target.value)} className="rounded border border-line px-3 py-2">
            <option value="">Unassigned</option>
            {salesUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <input value={newLead.businessName} onChange={(event) => updateNewLead("businessName", event.target.value)} placeholder="Business name" className="rounded border border-line px-3 py-2" />
          <input value={newLead.licenceNumber} onChange={(event) => updateNewLead("licenceNumber", event.target.value)} placeholder="License number" className="rounded border border-line px-3 py-2" />
          <input value={newLead.businessRegion} onChange={(event) => updateNewLead("businessRegion", event.target.value)} placeholder="Region" className="rounded border border-line px-3 py-2" />
          <input value={newLead.businessWoreda} onChange={(event) => updateNewLead("businessWoreda", event.target.value)} placeholder="Woreda" className="rounded border border-line px-3 py-2" />
          <button className="rounded bg-forest px-4 py-2 font-semibold text-white md:col-span-4">Add Lead</button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-lg font-bold">Recent Leads</h2>
            <span className="text-sm text-neutral-500">{leads.length} shown</span>
          </div>
        </div>
        <div className="grid gap-3 border-b border-line p-5 md:grid-cols-4">
          <input
            value={leadFilters.search}
            onChange={(event) => updateLeadFilter("search", event.target.value)}
            placeholder="Search name, phone, license, location"
            className="rounded border border-line px-3 py-2"
          />
          <select value={leadFilters.phase} onChange={(event) => updateLeadFilter("phase", event.target.value)} className="rounded border border-line px-3 py-2">
            <option value="ALL">All phases</option>
            {phaseOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={leadFilters.assignedToId} onChange={(event) => updateLeadFilter("assignedToId", event.target.value)} className="rounded border border-line px-3 py-2">
            <option value="">All assignments</option>
            <option value="UNASSIGNED">Unassigned</option>
            {salesUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <select value={leadFilters.createdById} onChange={(event) => updateLeadFilter("createdById", event.target.value)} className="rounded border border-line px-3 py-2">
            <option value="">Created by anyone</option>
            {salesUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">License</th>
                <th className="px-5 py-3">Region</th>
                <th className="px-5 py-3">Phase</th>
                <th className="px-5 py-3">Assigned</th>
                <th className="px-5 py-3">Created By</th>
                <th className="px-5 py-3">Appointment</th>
                <th className="px-5 py-3">Follow-Up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{lead.fullName}</p>
                    <p className="text-neutral-500">{lead.email}</p>
                  </td>
                  <td className="px-5 py-3">{lead.phoneNumber}</td>
                  <td className="px-5 py-3">{lead.licenceNumber || "-"}</td>
                  <td className="px-5 py-3">{lead.businessRegion || "-"}</td>
                  <td className="px-5 py-3"><Badge phase={lead.phase} /></td>
                  <td className="px-5 py-3">
                    <select
                      value={lead.assignedTo?.id || ""}
                      onChange={(event) => assignLead(lead.id, event.target.value)}
                      className="min-w-36 rounded border border-line px-2 py-1"
                    >
                      <option value="">Unassigned</option>
                      {salesUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">{lead.createdBy?.name || "-"}</td>
                  <td className="px-5 py-3">{formatDate(lead.appointmentDate)}</td>
                  <td className="px-5 py-3">{formatDate(lead.followUpDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
