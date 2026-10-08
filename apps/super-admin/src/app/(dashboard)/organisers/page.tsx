"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  Clock, 
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
  Mail, 
  Phone, 
  Building2, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  Users
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface Organiser {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone?: string | null;
  status: "APPROVED" | "PENDING" | "SUSPENDED" | string;
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "SUSPENDED">("ALL");

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

  const [isForbidden, setIsForbidden] = useState(false);

  // Toast / Feedback State
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
  const pendingCount = organisers.filter((o) => o.status === "PENDING").length;
  const suspendedCount = organisers.filter((o) => o.status === "SUSPENDED").length;

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    // Validate password rules
    const pwd = formData.password;
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
      setCreateError("Password must be 8+ chars and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/admin/organisers", formData);
      showToast(`Organiser "${formData.businessName}" created successfully!`);
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

  // Handle Status Update via Modal
  const handleConfirmStatusChange = async () => {
    if (!statusModalTarget) return;
    const { organiser, newStatus } = statusModalTarget;
    setIsStatusSubmitting(true);
    try {
      await api.patch(`/admin/organisers/${organiser.id}/status`, { status: newStatus });
      showToast(`Status updated to ${newStatus} for ${organiser.businessName}`);
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

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "OR";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-7xl pb-24">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-5 py-3.5 shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F6C636] animate-pulse"></div>
          <span className="text-xs font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Governance
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-2">
            Organisers Directory
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Review partner credentials, grant event publishing access, and maintain security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrganisers}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-bold transition-all shadow-xs"
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
            className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-2.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.01]"
          >
            <Plus className="h-4 w-4 stroke-3" />
            <span>Add New Organiser</span>
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
          <p className="text-xs font-semibold text-slate-500 mt-2 mb-6 leading-relaxed">
            Managing partner credentials and status is strictly reserved for Super Administrators. If your account role was recently updated, please sync your active session.
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-xs font-black text-slate-950 transition-all shadow-sm hover:scale-[1.02]"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync Session & Reload</span>
          </button>
        </div>
      ) : (
        <>
          {/* ===== Stat Cards ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total */}
        <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Partners</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <span>Platform-registered organizers</span>
          </div>
        </div>

        {/* Approved */}
        <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active & Approved</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Can publish and host events</span>
          </div>
        </div>

        {/* Pending */}
        <div className="group rounded-3xl bg-white p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Approval</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Awaiting administrator verification</span>
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
            <span>Access blocked / under review</span>
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                statusFilter === "APPROVED"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Approved</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${statusFilter === "APPROVED" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                statusFilter === "PENDING"
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Pending</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${statusFilter === "PENDING" ? "bg-black/10" : "bg-slate-200 text-slate-700"}`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("SUSPENDED")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Table / List ===== */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading verified organisers...</p>
          </div>
        ) : filteredOrganisers.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900">No organisers found</h3>
            <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 mb-5">
              {searchQuery
                ? `No partner matches "${searchQuery}". Try a different search phrase or clear the filter.`
                : "No organisers created yet. Click 'Add New Organiser' to onboard your first partner."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-xs font-black text-slate-950 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-3" />
                <span>Onboard Organiser</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Organiser & Entity</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4">Joined On</th>
                  <th className="px-6 py-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredOrganisers.map((org) => {
                  const isApproved = org.status === "APPROVED";
                  const isSuspended = org.status === "SUSPENDED";
                  const isPending = org.status === "PENDING";

                  return (
                    <tr key={org.id} className="transition-colors hover:bg-amber-50/20 group">
                      {/* Organiser / Entity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#FFF9EB] to-amber-100/80 border border-amber-200/70 flex items-center justify-center font-black text-amber-700 text-xs shrink-0 shadow-xs">
                            {getInitials(org.businessName)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                              {org.businessName}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                              Owner: {org.user?.name || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-700 font-bold">{org.contactEmail}</span>
                            <button
                              onClick={() => handleCopy(org.contactEmail, org.id + "-email")}
                              className="text-slate-400 hover:text-amber-600 transition-colors"
                              title="Copy email"
                            >
                              {copiedId === org.id + "-email" ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{org.contactPhone || "No phone added"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 border border-emerald-200/80">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold text-amber-700 border border-amber-200/80">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-extrabold text-rose-700 border border-rose-200/80">
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>Suspended</span>
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
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Reset Organiser Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Quick Status Toggles */}
                          {!isApproved && (
                            <button
                              onClick={() => setStatusModalTarget({ organiser: org, newStatus: "APPROVED" })}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 font-bold text-[11px] transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => setStatusModalTarget({ organiser: org, newStatus: "SUSPENDED" })}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-bold text-[11px] transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          )}

                          {/* More dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === org.id ? null : org.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdown === org.id && (
                              <div className="absolute right-0 top-10 w-44 rounded-2xl bg-white shadow-xl border border-slate-100 z-30 p-1.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                                <button
                                  onClick={() => {
                                    setResetError("");
                                    setNewPassword("");
                                    setResetModalTarget(org);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Reset Password</span>
                                </button>

                                {org.status !== "APPROVED" && (
                                  <button
                                    onClick={() => {
                                      setStatusModalTarget({ organiser: org, newStatus: "APPROVED" });
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center gap-2 transition-colors"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Approve Partner</span>
                                  </button>
                                )}

                                {org.status !== "SUSPENDED" && (
                                  <button
                                    onClick={() => {
                                      setStatusModalTarget({ organiser: org, newStatus: "SUSPENDED" });
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Suspend Partner</span>
                                  </button>
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
      {/* ===== MODAL 1: ADD NEW ORGANISER MODAL ===== */}
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
                  <h2 className="text-xl font-black text-slate-900">Onboard New Organiser</h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Create administrator-verified credentials for an event host.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Banner */}
            {createError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Owner / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="e.g. Skyline Productions LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="organizer@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Provisioning Password *
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all font-mono"
                    placeholder="Min 8 chars with Aa, 123, & #$@"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 text-[11px] font-semibold text-slate-600 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Must include: 8+ characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-xs font-black text-slate-950 transition-all shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-3" />
                      <span>Create & Onboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL 2: RESET PASSWORD MODAL ===== */}
      {/* ========================================================================= */}
      {resetModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Reset Password</h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Set a new security password for this partner.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalTarget(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Organiser Summary Card */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-800">
                {getInitials(resetModalTarget.businessName)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate">{resetModalTarget.businessName}</p>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{resetModalTarget.contactEmail}</p>
              </div>
            </div>

            {/* Error Banner */}
            {resetError && (
              <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-3 focus:ring-amber-400/20 transition-all font-mono"
                    placeholder="Enter new strong password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/50 space-y-1.5 text-[11px] font-semibold text-slate-600">
                <p className="font-bold text-slate-700 mb-1">Password Checklist:</p>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${newPassword.length >= 8 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    ✓
                  </span>
                  <span>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${/[A-Z]/.test(newPassword) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    ✓
                  </span>
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${/[a-z]/.test(newPassword) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    ✓
                  </span>
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${/[0-9]/.test(newPassword) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    ✓
                  </span>
                  <span>At least 1 number (0-9)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${/[^A-Za-z0-9]/.test(newPassword) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    ✓
                  </span>
                  <span>At least 1 special character (!@#$%^&*)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalTarget(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="px-5 py-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] text-xs font-black text-slate-950 transition-all shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {isResetSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-3" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===== MODAL 3: STATUS CHANGE CONFIRMATION MODAL ===== */}
      {/* ========================================================================= */}
      {statusModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  statusModalTarget.newStatus === "APPROVED"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                }`}
              >
                {statusModalTarget.newStatus === "APPROVED" ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Ban className="w-6 h-6" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {statusModalTarget.newStatus === "APPROVED" ? "Approve Organiser?" : "Suspend Organiser?"}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  You are about to change the status of{" "}
                  <strong className="text-slate-900">{statusModalTarget.organiser.businessName}</strong> to{" "}
                  <span
                    className={`font-black ${
                      statusModalTarget.newStatus === "APPROVED" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {statusModalTarget.newStatus}
                  </span>
                  .
                </p>

                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-600 leading-relaxed">
                  {statusModalTarget.newStatus === "APPROVED" ? (
                    <span>
                      ✓ The partner will be able to immediately log into the organizer portal and publish live ticketed events.
                    </span>
                  ) : (
                    <span>
                      ⚠️ Suspending will prevent the organizer from accessing their dashboard and modifying events until reinstated.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalTarget(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isStatusSubmitting}
                className={`px-5 py-2 rounded-2xl text-xs font-black text-white transition-all shadow-xs disabled:opacity-60 flex items-center gap-1.5 ${
                  statusModalTarget.newStatus === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isStatusSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {statusModalTarget.newStatus === "APPROVED" ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Confirm {statusModalTarget.newStatus === "APPROVED" ? "Approval" : "Suspension"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
