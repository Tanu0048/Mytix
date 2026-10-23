"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Lock, 
  Save, 
  Check, 
  Mail, 
  Phone, 
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Share2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "social">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Profile State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Security State
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "Aman Mirza",
        email: user.email || "aman@mytix.com",
        phone: user.phone || "+91 98112 69898",
      }));
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await api.patch("/me", {
        name: formData.name,
        phone: formData.phone
      });

      if (setUser && res.data) {
        setUser({ ...user, ...res.data });
      }

      setSuccessMsg("Profile details successfully updated!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await api.post("/users/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setSuccessMsg("Password successfully updated in your account!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || err.response?.data?.message || "Failed to update password. Please check your current password.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (formData.name || "Aman Mirza")
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-5xl pb-24 relative">
      {/* Ambient decorative glow */}
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ===== HEADER ===== */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200/60 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Account & <span className="text-amber-500">Settings</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Manage your personal profile, security credentials, and platform integration.
          </p>
        </div>

        {/* Global Save Feedback */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-sm font-bold shadow-2xs animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-sm font-bold shadow-2xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </header>

      {/* ===== NAVIGATION TABS ===== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-7">
        {[
          { id: "profile", label: "Profile & Personal", icon: User },
          { id: "security", label: "Security & Login", icon: Lock },
          ...(user?.role === "ADMIN" ? [{ id: "social", label: "Social Links", icon: Share2 }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#FFF9EB] text-amber-950 border border-amber-300/80 shadow-2xs font-extrabold"
                  : "bg-white text-slate-500 hover:text-slate-900 border border-slate-100 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== TAB CONTENT 1: PROFILE ===== */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          
          {/* Card: Avatar & Role */}
          <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-3xl bg-linear-to-tr from-amber-400 to-amber-200 border-2 border-amber-300 text-amber-950 font-black text-2xl flex items-center justify-center shadow-md">
                    {initials}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{formData.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                      {user?.role || "ORGANISER"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-400 mt-0.5">{formData.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Personal Details Form */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Personal Information</h3>
                <p className="text-sm font-semibold text-slate-400 mt-0.5">
                  Update your contact info and public organiser display name.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-100/70 py-3 px-4 text-sm font-semibold text-slate-500 cursor-not-allowed outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
                  Email change requires administrator verification.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98112 69898"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Portal Access Role</label>
                <input
                  type="text"
                  value={user?.role === "ADMIN" ? "Super Administrator (Full Root Access)" : "Authorized Event Organiser"}
                  disabled
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-100/70 py-3 px-4 text-sm font-semibold text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-8 py-3.5 text-sm font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>{isSaving ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>

          </div>

        </form>
      )}

      {/* ===== TAB CONTENT 2: SECURITY ===== */}
      {activeTab === "security" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
            
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Password & Authentication</h3>
                <p className="text-sm font-semibold text-slate-400 mt-0.5">
                  Ensure your portal account is guarded with strong credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
              
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">New Password</label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Confirm New Password</label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-7 py-3 text-sm font-black text-slate-950 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? "Updating..." : "Update Password"}</span>
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* ===== TAB CONTENT 3: SOCIAL LINKS (ADMIN ONLY) ===== */}
      {activeTab === "social" && (
        <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">User Footer Social Links</h3>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">
                Manage dynamic social media circular icons and direct homepages rendered on user-side web & mobile footers.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">Full Footer Social Media Manager</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Customize platform names, circle letter badges (F, X, Y, I, etc.), URLs, active toggles, and view live previews.
              </p>
            </div>
            <Link
              href="/social-links"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all shrink-0 cursor-pointer"
            >
              <span>Open Social Links Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
