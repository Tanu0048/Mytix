"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  MoreVertical, 
  KeyRound, 
  CheckCircle, 
  Ban, 
  X, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Building2, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  Users,
  Trash2
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface Organiser {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone?: string | null;
  status: "APPROVED" | "SUSPENDED" | string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function OrganisersPage() {
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "SUSPENDED">("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    contactPhone: ""
  });

  // Success Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string;
    email: string;
    password: string;
  } | null>(null);

  // Action Dropdown State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Status Change Confirmation Modal State
  const [statusModalTarget, setStatusModalTarget] = useState<{ organiser: Organiser; newStatus: "APPROVED" | "SUSPENDED" } | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Reset Password Modal State
  const [resetModalTarget, setResetModalTarget] = useState<Organiser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  // Delete Organiser Modal State
  const [deleteModalTarget, setDeleteModalTarget] = useState<Organiser | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const [isForbidden, setIsForbidden] = useState(false);

  // Toast State
  const [toastMsg, setToastMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchOrganisers = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get("/admin/organisers");
      setOrganisers(res.data.data || []);
      setIsForbidden(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsForbidden(true);
      } else {
        console.warn("Failed to fetch organisers", err?.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrganisers();
  }, []);

  // Filtered list
  const filteredOrganisers = useMemo(() => {
    return organisers.filter((org) => {
      const matchesStatus = statusFilter === "ALL" || org.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        org.businessName?.toLowerCase().includes(q) ||
        org.user?.name?.toLowerCase().includes(q) ||
        org.contactEmail?.toLowerCase().includes(q) ||
        org.contactPhone?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [organisers, statusFilter, searchQuery]);

  // Derived counts
  const totalCount = organisers.length;
  const approvedCount = organisers.filter((o) => o.status === "APPROVED").length;
  const suspendedCount = organisers.filter((o) => o.status === "SUSPENDED").length;

  // Generate random strong password
  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Org@${randomPart}9!`;
    setFormData((prev) => ({ ...prev, password: generated }));
    setShowCreatePassword(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    const pwd = formData.password;
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
      setCreateError("Password must be 8+ chars and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/admin/organisers", formData);
      setCreatedCredentials({
        businessName: formData.businessName,
        email: formData.email,
        password: formData.password
      });
      setIsCreateModalOpen(false);
      setFormData({ name: "", email: "", password: "", businessName: "", contactPhone: "" });
      fetchOrganisers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || "Failed to create organiser";
      setCreateError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Update (Suspend / Activate)
  const handleConfirmStatusChange = async () => {
    if (!statusModalTarget) return;
    const { organiser, newStatus } = statusModalTarget;
    setIsStatusSubmitting(true);
    try {
      await api.patch(`/admin/organisers/${organiser.id}/status`, { status: newStatus });
      showToast(`Status updated to ${newStatus === "APPROVED" ? "Active" : "Suspended"} for ${organiser.businessName}`);
      setStatusModalTarget(null);
      fetchOrganisers();
      setOpenDropdown(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      showToast(`Error updating status: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  // Handle Reset Password via Modal
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalTarget) return;
    setResetError("");

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setResetError("Password must be 8+ chars with uppercase, lowercase, number, and special symbol.");
      return;
    }

    setIsResetSubmitting(true);
    try {
      await api.patch(`/admin/organisers/${resetModalTarget.id}/reset-password`, { newPassword });
      showToast(`Password successfully reset for ${resetModalTarget.businessName}!`);
      setResetModalTarget(null);
      setNewPassword("");
      setOpenDropdown(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setResetError(err.response?.data?.error?.message || err.message || "Failed to reset password");
    } finally {
      setIsResetSubmitting(false);
    }
  };

  // Handle Delete Organiser
  const handleConfirmDelete = async () => {
    if (!deleteModalTarget) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/admin/organisers/${deleteModalTarget.id}`);
      showToast(`Organiser account deleted successfully!`);
      setDeleteModalTarget(null);
      fetchOrganisers();
      setOpenDropdown(null);
    } catch (err: any) {
      showToast(`Error deleting account: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-7xl pb-24 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
              <ShieldCheck className="w-3.5 h-3.5" /> Organiser Management
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-2">
            Organisers Directory
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Create organiser accounts, assign login credentials, and manage access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrganisers}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm font-bold transition-all shadow-xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setCreateError("");
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-2.5 text-sm font-black text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-3" />
            <span>Create New Organiser</span>
          </button>
        </div>
      </header>

      {/* ===== Access Forbidden Fallback Screen ===== */}
      {isForbidden ? (
        <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] p-12 text-center max-w-lg mx-auto my-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Administrator Clearance Required</h2>
          <p className="text-sm font-semibold text-slate-500 mt-2 mb-6 leading-relaxed">
            Managing partner credentials is strictly reserved for Super Administrators. Please sync your active session.
          </p>
          <button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                const res = await api.get("/me");
                if (res.data?.data) {
                  useAuthStore.getState().setUser(res.data.data);
                }
              } catch {}
              await fetchOrganisers();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-sm font-black text-slate-950 transition-all shadow-sm hover:scale-[1.02]"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync Session & Reload</span>
          </button>
        </div>
      ) : (
        <>
          {/* ===== 3 Stat Cards ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* Total */}
            <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Organisers</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{totalCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span>Registered organiser accounts</span>
              </div>
            </div>

            {/* Active */}
            <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active & Ready</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{approvedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Can log in & create events</span>
              </div>
            </div>

            {/* Suspended */}
            <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Suspended</p>
                  <p className="text-3xl font-black text-rose-600 mt-1">{suspendedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/50 flex items-center justify-center text-rose-600">
                  <UserX className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Login temporarily blocked</span>
              </div>
            </div>
          </div>

          {/* ===== Toolbar & Filters ===== */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] p-5 mb-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-50 border border-slate-200/60 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-[#F6C636] text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>All</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-[10px] font-extrabold">{totalCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter("APPROVED")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    statusFilter === "APPROVED"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>Active</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${statusFilter === "APPROVED" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>
                    {approvedCount}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter("SUSPENDED")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
                    statusFilter === "SUSPENDED"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>Suspended</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${statusFilter === "SUSPENDED" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>
                    {suspendedCount}
                  </span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by business, name, email..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ===== Organisers Table ===== */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] overflow-hidden">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-sm font-bold">Loading organisers directory...</p>
              </div>
            ) : filteredOrganisers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">No Organisers Found</h3>
                <p className="text-sm font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No partners match your search query." : "Click 'Create New Organiser' above to add your first partner account."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Business / Host</th>
                      <th className="px-6 py-4">Account User</th>
                      <th className="px-6 py-4">Contact Phone</th>
                      <th className="px-6 py-4">Account Status</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredOrganisers.map((org) => {
                      const isApproved = org.status === "APPROVED";
                      return (
                        <tr key={org.id} className="hover:bg-slate-50/40 transition-colors">
                          {/* Business */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-700 font-black text-sm shrink-0">
                                {org.businessName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900">{org.businessName}</p>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{org.contactEmail}</p>
                              </div>
                            </div>
                          </td>

                          {/* Account User */}
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{org.user?.name || "—"}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{org.user?.email}</p>
                          </td>

                          {/* Contact Phone */}
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-600">{org.contactPhone || "—"}</span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Suspended
                              </span>
                            )}
                          </td>

                          {/* Joined Date */}
                          <td className="px-6 py-4 text-slate-500 font-bold">
                            {new Date(org.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right relative">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Password Reset */}
                              <button
                                onClick={() => {
                                  setResetError("");
                                  setNewPassword("");
                                  setResetModalTarget(org);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Reset Organiser Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Quick Status Toggle */}
                              {isApproved ? (
                                <button
                                  onClick={() => setStatusModalTarget({ organiser: org, newStatus: "SUSPENDED" })}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setStatusModalTarget({ organiser: org, newStatus: "APPROVED" })}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Activate</span>
                                </button>
                              )}

                              {/* More dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === org.id ? null : org.id)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openDropdown === org.id && (
                                  <div className="absolute right-0 top-10 w-44 rounded-2xl bg-white shadow-xl border border-slate-100 z-30 p-1.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                    <button
                                      onClick={() => {
                                        handleCopy(org.contactEmail, org.id);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Copy Email</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setResetError("");
                                        setNewPassword("");
                                        setResetModalTarget(org);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-3 py-2 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Reset Password</span>
                                    </button>

                                    {isApproved ? (
                                      <button
                                        onClick={() => {
                                          setStatusModalTarget({ organiser: org, newStatus: "SUSPENDED" });
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Suspend Account</span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setStatusModalTarget({ organiser: org, newStatus: "APPROVED" });
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full px-3 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          <span>Activate Account</span>
                                        </button>
                                        
                                        {org.status === "SUSPENDED" && (
                                          <button
                                            onClick={() => {
                                              setDeleteModalTarget(org);
                                              setOpenDropdown(null);
                                            }}
                                            className="w-full mt-1 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete Account</span>
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: CREATE NEW ORGANISER MODAL ===== */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Create Organiser Account</h2>
                  <p className="text-sm font-semibold text-slate-400">
                    Create credentials directly. The organiser can log in immediately.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Banner */}
            {createError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Organiser / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="e.g. Comedy Central Club"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Login Email (User ID) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="organizer@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                  >
                    ⚡ Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all font-mono"
                    placeholder="Min 8 chars with uppercase, number & symbol"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-sm font-black text-slate-950 transition-all shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-3" />
                      <span>Create Organiser</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== SUCCESS MODAL: COPY CREDENTIALS ===== */}
      {/* ========================================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Organiser Account Created!</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              Account for <strong>{createdCredentials.businessName}</strong> is active. Share these login details with the organiser:
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2.5 mb-6 text-sm font-mono">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Login Portal</span>
                <span className="text-slate-800 font-bold select-all">http://localhost:3001/login</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Role</span>
                <span className="text-slate-800 font-bold">Organiser</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Login Email (ID)</span>
                <span className="text-slate-900 font-black select-all">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Password</span>
                <span className="text-slate-900 font-black select-all">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const text = `🎉 Your Mytix Organiser Account is Ready!\n\nPortal: http://localhost:3001/login\nRole: Organiser\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\n\nYou can log in and start creating events immediately!`;
                  navigator.clipboard.writeText(text);
                  showToast("Login details copied to clipboard!");
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-sm font-black text-slate-950 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Login Details</span>
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: STATUS CHANGE CONFIRMATION ===== */}
      {/* ========================================================================= */}
      {statusModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
              statusModalTarget.newStatus === "APPROVED" 
                ? "bg-emerald-50 border-emerald-200/60 text-emerald-600" 
                : "bg-rose-50 border-rose-200/60 text-rose-600"
            }`}>
              {statusModalTarget.newStatus === "APPROVED" ? <CheckCircle className="w-7 h-7" /> : <Ban className="w-7 h-7" />}
            </div>

            <h3 className="text-xl font-black text-slate-900">
              {statusModalTarget.newStatus === "APPROVED" ? "Activate Organiser?" : "Suspend Organiser?"}
            </h3>

            <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
              {statusModalTarget.newStatus === "APPROVED"
                ? `Activate account for "${statusModalTarget.organiser.businessName}". They will be able to log in and publish events.`
                : `Suspend account for "${statusModalTarget.organiser.businessName}". Their active login will be paused.`}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStatusModalTarget(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStatusSubmitting}
                onClick={handleConfirmStatusChange}
                className={`px-6 py-2.5 rounded-2xl text-sm font-black transition-all shadow-xs cursor-pointer ${
                  statusModalTarget.newStatus === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {isStatusSubmitting ? "Updating..." : statusModalTarget.newStatus === "APPROVED" ? "Activate" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: RESET PASSWORD ===== */}
      {/* ========================================================================= */}
      {resetModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reset Password</h3>
                  <p className="text-sm font-semibold text-slate-400 mt-0.5">
                    {resetModalTarget.businessName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalTarget(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetError && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmResetPassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all font-mono"
                    placeholder="Enter new 8+ char password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalTarget(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-sm font-black text-slate-950 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isResetSubmitting ? "Resetting..." : "Save New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL: DELETE CONFIRMATION ===== */}
      {/* ========================================================================= */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border bg-rose-50 border-rose-200/60 text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900">Delete Organiser</h3>
            <p className="text-sm font-semibold text-slate-500 mt-2 mb-6 leading-relaxed">
              Are you absolutely sure you want to permanently delete the account for <strong className="text-slate-800">{deleteModalTarget.businessName}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalTarget(null)}
                disabled={isDeleteSubmitting}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleteSubmitting}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-sm font-black text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
