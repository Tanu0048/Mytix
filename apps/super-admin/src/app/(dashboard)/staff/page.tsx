"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Key, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  QrCode, 
  DoorOpen, 
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Search,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import api, { fetchAllPages } from "@/lib/api";

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  assignedGate: string | null;
  assignedEvent: { id: string; title: string } | null;
  isActive: boolean;
  createdAt: string;
}

interface EventOption {
  id: string;
  title: string;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    staffId: "",
    password: "",
    assignedGate: "Gate 1",
    eventId: ""
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Saved Staff Credentials Preview Modal (2-step confirmation)
  const [savedStaffCredentials, setSavedStaffCredentials] = useState<{
    staffId: string;
    staffName: string;
    password: string;
    gate?: string;
    isNew?: boolean;
  } | null>(null);
  const [copiedStaffPassword, setCopiedStaffPassword] = useState(false);


  const fetchStaffAndEvents = async () => {
    try {
      setLoading(true);
      const [staffRes, eventsRes] = await Promise.all([
        api.get("/organiser/staff"),
        fetchAllPages<{ id: string; title: string }>("/organiser/events")
      ]);

      if (staffRes.data?.data) {
        setStaffList(staffRes.data.data);
      }
      setEvents(eventsRes.map((e) => ({ id: e.id, title: e.title })));
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load staff list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndEvents();
  }, []);

  const generateSuggestedId = () => {
    const random = Math.floor(100 + Math.random() * 900);
    return `STF-${random}`;
  };

  const handleOpenAddModal = () => {
    setAddForm({
      name: "",
      staffId: generateSuggestedId(),
      password: "Pass" + Math.floor(1000 + Math.random() * 9000) + "!",
      assignedGate: "Gate 1 - Turnstiles",
      eventId: events[0]?.id || ""
    });
    setShowAddModal(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdd(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.post("/organiser/staff", addForm);
      if (res.data?.data) {
        setStaffList(prev => [res.data.data, ...prev]);
      }
      setSavedStaffCredentials({
        staffId: addForm.staffId,
        staffName: addForm.name,
        password: addForm.password,
        gate: addForm.assignedGate,
        isNew: true
      });
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error?.message || "Failed to create staff member.");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    try {
      const nextStatus = !staff.isActive;
      await api.patch(`/organiser/staff/${staff.id}/status`, { isActive: nextStatus });
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, isActive: nextStatus } : s));
      setSuccessMsg(`Staff ${staff.staffId} access ${nextStatus ? "enabled" : "revoked"}.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      setErrorMsg("Failed to update staff status.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSavingPassword(true);
    setErrorMsg("");

    try {
      await api.patch(`/organiser/staff/${selectedStaff.id}/password`, { password: newPassword });
      setSavedStaffCredentials({
        staffId: selectedStaff.staffId,
        staffName: selectedStaff.name,
        password: newPassword,
        gate: selectedStaff.assignedGate || undefined,
        isNew: false
      });
      setShowPasswordModal(false);
      setSelectedStaff(null);
      setNewPassword("");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to update staff password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!window.confirm(`Are you sure you want to delete staff account ${staff.staffId}? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/organiser/staff/${staff.id}`);
      setStaffList(prev => prev.filter(s => s.id !== staff.id));
      setSuccessMsg(`Staff member ${staff.staffId} deleted.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      setErrorMsg("Failed to delete staff member.");
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.assignedGate && s.assignedGate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Gate Staff & Scanner Accounts
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500">
              Create and manage mobile ticket scanner credentials for your venue door staff.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[13px] sm:text-sm font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search and Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Staff ID or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 w-full sm:w-auto justify-end">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
            Total Staff: {staffList.length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
            Active: {staffList.filter(s => s.isActive).length}
          </span>
        </div>
      </div>

      {/* Staff Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[35vh]">
          <div className="flex flex-col items-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-[13px] text-slate-500">Loading Staff accounts...</span>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">No Gate Staff Found</h3>
          <p className="text-[13px] text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? "No staff matching your search filter." 
              : "You haven't created any gate scanner accounts yet. Click 'Add Staff Member' to get started."}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Staff Account
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          
          {/* Mobile Card View (phones & small tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredStaff.map((staff) => (
              <div key={staff.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-semibold text-[13px] shrink-0">
                      {staff.staffId.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 tracking-tight text-sm">
                        {staff.staffId}
                      </p>
                      <p className="text-[13px] text-slate-400 font-medium">{staff.name}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(staff)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition cursor-pointer active:scale-95 ${
                      staff.isActive 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {staff.isActive ? "Active" : "Revoked"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[13px] text-slate-500 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{staff.assignedGate || "Any Gate"}</span>
                  </div>
                  <span className="truncate max-w-[160px] font-medium text-slate-600">
                    {staff.assignedEvent?.title || "All Events"}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setNewPassword("");
                      setShowPasswordModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[13px] hover:bg-slate-100 active:scale-95 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(staff)}
                    className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 active:scale-95 cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="py-3.5 px-5">Staff ID & Name</th>
                  <th className="py-3.5 px-5">Assigned Gate</th>
                  <th className="py-3.5 px-5">Assigned Event</th>
                  <th className="py-3.5 px-5">Access Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-semibold text-[13px] shrink-0">
                          {staff.staffId.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                            {staff.staffId}
                          </p>
                          <p className="text-[13px] text-slate-400 font-medium">{staff.name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[13px] font-semibold">
                        <DoorOpen className="w-3 h-3 text-slate-400" />
                        {staff.assignedGate || "Any Gate"}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="text-[13px] font-semibold text-slate-600">
                        {staff.assignedEvent?.title || "All Organiser Events"}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(staff)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold transition cursor-pointer ${
                          staff.isActive 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                        title="Click to toggle access"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {staff.isActive ? "Active" : "Revoked"}
                      </button>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setNewPassword("");
                            setShowPasswordModal(true);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          title="Change Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD STAFF MEMBER ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Add Gate Staff Member</h3>
                <p className="text-[13px] text-slate-500">Create login credentials for turnstile scanning</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Alex Jenkins"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[13px] font-semibold text-slate-700">Staff ID (Login)</label>
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, staffId: generateSuggestedId() })}
                      className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={addForm.staffId}
                    onChange={(e) => setAddForm({ ...addForm, staffId: e.target.value.toUpperCase() })}
                    placeholder="e.g. GATE1_ALEX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold uppercase tracking-wider focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Assigned Gate
                  </label>
                  <input
                    type="text"
                    value={addForm.assignedGate}
                    onChange={(e) => setAddForm({ ...addForm, assignedGate: e.target.value })}
                    placeholder="e.g. Gate 1 - Turnstiles"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Assigned Event
                  </label>
                  <select
                    value={addForm.eventId}
                    onChange={(e) => setAddForm({ ...addForm, eventId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">All My Events</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[13px]">
                <p className="font-semibold">Staff ID & Password are ready:</p>
                <p className="mt-0.5 text-slate-600">Give these credentials to the staff member so they can log in at the gate scanner.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[13px] font-semibold transition disabled:opacity-60 cursor-pointer"
                >
                  {savingAdd ? "Creating..." : "Save Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE PASSWORD ================= */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Change Staff Password</h3>
                <p className="text-[13px] text-slate-500">Update password for {selectedStaff.staffId}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[13px] font-semibold transition disabled:opacity-60 cursor-pointer"
                >
                  {savingPassword ? "Changing..." : "Confirm & Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PREVIEW & COPY SAVED STAFF CREDENTIALS ================= */}
      {savedStaffCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {savedStaffCredentials.isNew ? "Staff Account Created" : "Password Changed"}
              </h3>
              <p className="text-[13px] text-slate-400 font-semibold mt-0.5">
                {savedStaffCredentials.staffName} ({savedStaffCredentials.staffId})
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 text-[13px]">
                <span className="font-semibold text-slate-500">Staff Login ID:</span>
                <span className="font-semibold text-slate-900 font-mono text-sm tracking-wider">{savedStaffCredentials.staffId}</span>
              </div>

              {savedStaffCredentials.gate && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 text-[13px]">
                  <span className="font-semibold text-slate-500">Assigned Gate:</span>
                  <span className="font-semibold text-slate-800">{savedStaffCredentials.gate}</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-sm font-semibold text-slate-900">
                  <span className="select-all tracking-wider">{savedStaffCredentials.password}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(savedStaffCredentials.password);
                      setCopiedStaffPassword(true);
                      setTimeout(() => setCopiedStaffPassword(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[13px] font-semibold text-slate-700 transition active:scale-95 cursor-pointer"
                  >
                    {copiedStaffPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[13px] font-semibold leading-relaxed text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Store the password safely. After closing this window, this password will not be shown again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSavedStaffCredentials(null);
                setCopiedStaffPassword(false);
                setSuccessMsg(savedStaffCredentials.isNew ? "Staff credentials recorded." : "Staff password saved.");
                setTimeout(() => setSuccessMsg(""), 3500);
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold transition cursor-pointer active:scale-98"
            >
              Done / I Have Stored The Password
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
