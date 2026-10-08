"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Building, 
  Lock, 
  Bell, 
  Save, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles,
  Camera,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [activeTab, setActiveTab] = useState<"profile" | "business" | "security" | "notifications">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Profile State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "Passionate event organizer creating memorable concert and live festival experiences.",
  });

  // Business / Payout State
  const [businessData, setBusinessData] = useState({
    businessName: "Mytix Live Productions",
    taxId: "GSTIN-27AABCM9124K1Z0",
    bankName: "HDFC Bank Ltd.",
    accountHolder: "Aman Mirza",
    accountNumber: "50100492819321",
    ifscCode: "HDFC0001234",
    payoutSchedule: "Weekly (Every Wednesday)"
  });

  // Security State
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    ticketSales: true,
    eventMilestones: true,
    payoutAlerts: true,
    marketingUpdates: false,
  });

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
      const res = await api.patch("/users", {
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

  const handleGenericSave = (section: string) => {
    setIsSaving(true);
    setSuccessMsg("");
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMsg(`${section} preferences saved successfully!`);
      setTimeout(() => setSuccessMsg(""), 3500);
    }, 600);
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
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Manage your personal profile, payout accounts, security, and alerts.
          </p>
        </div>

        {/* Global Save Feedback */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-bold shadow-2xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </header>

      {/* ===== NAVIGATION TABS ===== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-7">
        {[
          { id: "profile", label: "Profile & Personal", icon: User },
          { id: "business", label: "Business & Payouts", icon: Building },
          { id: "security", label: "Security & Login", icon: Lock },
          { id: "notifications", label: "Alerts & Preferences", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-sm cursor-pointer"
                    title="Change Avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{formData.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                      {user?.role || "ORGANISER"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{formData.email}</p>
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Account
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Account ID</span>
                <span className="font-mono text-xs font-bold text-slate-700 block mt-0.5">
                  {user?.id?.substring(0, 14) || "ORG-892410"}...
                </span>
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
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Update your contact info and public organiser display name.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Email Address <span className="text-slate-400 font-normal">(Read Only)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full rounded-2xl border border-slate-200/60 bg-slate-100/70 py-3 pl-10 pr-4 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Operating City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    defaultValue="Melbourne / Mumbai"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                  />
                </div>
              </div>

            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Organizer Bio
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-8 py-3.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>{isSaving ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>

          </div>

        </form>
      )}

      {/* ===== TAB CONTENT 2: BUSINESS & PAYOUTS ===== */}
      {activeTab === "business" && (
        <div className="space-y-6">
          
          {/* Ambient Notice */}
          <div className="p-5 rounded-3xl bg-[#FFF9EB] border border-amber-200/80 flex items-start gap-3.5">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-950">Automated Direct Payouts Active</h4>
              <p className="text-[11px] font-semibold text-amber-900/80 mt-0.5 leading-relaxed">
                Net event ticket revenue is automatically transferred to your verified bank account every Wednesday, minus standard payment gateway fees.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
            
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Banking & Settlement Credentials</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Verified bank account where ticket sales revenue will be deposited.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Business / Brand Entity</label>
                <input
                  type="text"
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Tax ID / GST Number</label>
                <input
                  type="text"
                  value={businessData.taxId}
                  onChange={(e) => setBusinessData({ ...businessData, taxId: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Account Beneficiary Name</label>
                <input
                  type="text"
                  value={businessData.accountHolder}
                  onChange={(e) => setBusinessData({ ...businessData, accountHolder: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={businessData.bankName}
                  onChange={(e) => setBusinessData({ ...businessData, bankName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Account Number / IBAN</label>
                <input
                  type="text"
                  value={businessData.accountNumber}
                  onChange={(e) => setBusinessData({ ...businessData, accountNumber: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">IFSC / Routing Code</label>
                <input
                  type="text"
                  value={businessData.ifscCode}
                  onChange={(e) => setBusinessData({ ...businessData, ifscCode: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white font-mono uppercase"
                />
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleGenericSave("Payout Banking")}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-8 py-3.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Save Banking Details</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ===== TAB CONTENT 3: SECURITY ===== */}
      {activeTab === "security" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
            
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Password & Authentication</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Ensure your portal account is guarded with a strong credentials.
                </p>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
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
                <label className="block text-xs font-bold text-slate-800 mb-2">New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGenericSave("Password")}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-7 py-3 text-xs font-black text-slate-950 transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Update Password</span>
                </button>
              </div>

            </div>

            {/* 2FA Card */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-slate-900">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Secure organizer login with verification code confirmation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  twoFactorEnabled ? "bg-amber-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ===== TAB CONTENT 4: NOTIFICATIONS ===== */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
            
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Notification Alerts & Channels</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Choose how and when Mytix sends updates to your phone and inbox.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              
              {[
                {
                  key: "ticketSales",
                  title: "Ticket Purchase Notifications",
                  desc: "Get an instant notification whenever an attendee buys tickets to your event.",
                },
                {
                  key: "payoutAlerts",
                  title: "Settlement & Payout Deposits",
                  desc: "Receive confirmation receipts when weekly revenue is wired to your bank.",
                },
                {
                  key: "eventMilestones",
                  title: "Milestone & Capacity Warnings",
                  desc: "Get alerted when ticket tiers reach 80% or 100% sold-out capacity.",
                },
                {
                  key: "marketingUpdates",
                  title: "Organizer Growth Digest",
                  desc: "Weekly emails with promotional tips and ticketing trend insights.",
                },
              ].map((item) => {
                const isChecked = (notifications as any)[item.key];
                return (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNotifications({ ...notifications, [item.key]: !isChecked })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isChecked ? "bg-amber-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isChecked ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleGenericSave("Notification preferences")}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-8 py-3.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Save Notification Settings</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
