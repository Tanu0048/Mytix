"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { Search, Bell, ChevronDown, PanelLeft } from "lucide-react";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  const displayName = user?.name || "Aman Mirza";
  const displayRole = user?.role === "ADMIN" ? "Administrator" : "Organiser";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-8 py-4 flex items-center justify-between">
      
      {/* Left side: Toggle button + Search Input */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 transition-colors cursor-pointer shadow-2xs shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="relative w-64 sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/80 bg-slate-50/60 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
          />
        </div>
      </div>

      {/* Right Controls: Notification + Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="relative w-10 h-10 rounded-xl border border-slate-200/60 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white"></span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-linear-to-tr from-amber-400 to-amber-200 text-slate-900 font-extrabold text-sm flex items-center justify-center shadow-xs border border-amber-300">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-extrabold text-slate-900 leading-tight group-hover:text-amber-700 transition-colors">
              {displayName}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 leading-none mt-0.5 capitalize">
              {displayRole}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 group-hover:text-slate-600" />
        </div>
      </div>
    </header>
  );
}
