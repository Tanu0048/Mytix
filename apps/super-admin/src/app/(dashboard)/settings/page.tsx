"use client";

import { Save, User, Building } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "ORGANISER") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Account Settings
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Manage your organiser profile and business details.
          </p>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" /> Personal Details
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <input type="text" defaultValue={user.name} disabled className="w-full sm:w-96 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-500 outline-none cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input type="email" defaultValue={user.email} disabled className="w-full sm:w-96 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-500 outline-none cursor-not-allowed" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 mt-12 flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald-600" /> Business Details
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payout Account (BSB)</label>
              <input type="text" placeholder="000-000" className="w-full sm:w-96 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Account Number</label>
              <input type="text" placeholder="123456789" className="w-full sm:w-96 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm">
              <Save className="h-4 w-4" /> Save Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Platform Settings
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Manage global platform configurations.
        </p>
      </header>

      <div className="rounded-2xl bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Commission Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Platform Fee (%)</label>
            <input type="number" defaultValue="5" className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            <p className="text-xs text-slate-500 mt-2 font-semibold">Percentage charged on every ticket sale.</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Maximum Organisers per page</label>
            <input type="number" defaultValue="20" className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm">
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
