"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Plus, UserCheck, UserX, Clock, MoreVertical, KeyRound, CheckCircle, Ban, X } from "lucide-react";
import api from "@/lib/api";

export default function OrganisersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [organisers, setOrganisers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    contactPhone: ""
  });

  // Action Dropdown State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchOrganisers = async () => {
    try {
      const res = await api.get("/admin/organisers");
      setOrganisers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch organisers", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrganisers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/admin/organisers", formData);
      alert("Organiser created successfully!");
      setIsCreateModalOpen(false);
      setFormData({ name: "", email: "", password: "", businessName: "", contactPhone: "" });
      fetchOrganisers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || "Failed to create organiser";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this organiser as ${newStatus}?`)) return;
    try {
      await api.patch(`/admin/organisers/${id}/status`, { status: newStatus });
      alert(`Status updated to ${newStatus}`);
      fetchOrganisers();
      setOpenDropdown(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(`Error updating status: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("Enter new password for this organiser (Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char):");
    if (!newPassword) return;
    
    try {
      await api.patch(`/admin/organisers/${id}/reset-password`, { newPassword });
      alert("Password reset successfully!");
      setOpenDropdown(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(`Error resetting password: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  // Stats
  const approvedCount = organisers.filter(o => o.status === "APPROVED").length;
  const pendingCount = organisers.filter(o => o.status === "PENDING").length;
  const suspendedCount = organisers.filter(o => o.status === "SUSPENDED").length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Organisers Management
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Review, approve, and manage event organisers on the platform.
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" /> Add New Organiser
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><UserCheck className="h-6 w-6" /></div>
          <div><p className="text-sm font-bold text-slate-500">Approved</p><p className="text-2xl font-black text-slate-900">{approvedCount}</p></div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-6 w-6" /></div>
          <div><p className="text-sm font-bold text-slate-500">Pending</p><p className="text-2xl font-black text-slate-900">{pendingCount}</p></div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600"><UserX className="h-6 w-6" /></div>
          <div><p className="text-sm font-bold text-slate-500">Suspended</p><p className="text-2xl font-black text-slate-900">{suspendedCount}</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search organisers..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"><Filter className="h-4 w-4" /> Filter</button>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-96">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Organiser / Business</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-semibold">Loading organisers...</td>
                </tr>
              ) : organisers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-semibold">No organisers found.</td>
                </tr>
              ) : (
                organisers.map((org) => (
                  <tr key={org.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{org.businessName}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{org.user?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700">{org.contactEmail}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{org.contactPhone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {org.status === 'APPROVED' && <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>}
                      {org.status === 'PENDING' && <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</span>}
                      {org.status === 'SUSPENDED' && <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 border border-red-200"><Ban className="w-3 h-3 mr-1" /> Suspended</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">
                      {new Date(org.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setOpenDropdown(openDropdown === org.id ? null : org.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === org.id && (
                        <div className="absolute right-8 top-12 mt-1 w-48 rounded-xl bg-white shadow-xl border border-slate-100 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
                          <div className="py-1">
                            {org.status !== 'APPROVED' && (
                              <button onClick={() => handleUpdateStatus(org.id, 'APPROVED')} className="w-full px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Approve Organiser
                              </button>
                            )}
                            {org.status !== 'SUSPENDED' && (
                              <button onClick={() => handleUpdateStatus(org.id, 'SUSPENDED')} className="w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Ban className="w-4 h-4" /> Suspend Organiser
                              </button>
                            )}
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => handleResetPassword(org.id)} className="w-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <KeyRound className="w-4 h-4" /> Reset Password
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Organiser Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add New Organiser</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name *</label>
                  <input 
                    type="text" required
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="John Doe" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Business Name *</label>
                  <input 
                    type="text" required
                    value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="JD Events LLC" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address *</label>
                  <input 
                    type="email" required
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="john@events.com" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Contact Phone</label>
                  <input 
                    type="text"
                    value={formData.contactPhone} onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="+91 9876543210" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Initial Password *</label>
                <input 
                  type="text" required
                  value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="e.g. SecurePass123!" 
                />
                <p className="text-xs text-slate-500 mt-1.5 font-medium">Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Creating..." : "Create Organiser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
