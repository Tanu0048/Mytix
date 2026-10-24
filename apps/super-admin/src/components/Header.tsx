"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { ChevronDown, PanelLeft } from "lucide-react";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  const displayName = user?.name || "Aman Mirza";
  const displayRole = user?.role === "ADMIN" ? "Administrator" : "Organiser";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-8 py-4 flex items-center justify-between">
      
      {/* Left side: Toggle button and Mobile Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 transition-colors cursor-pointer shadow-2xs shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <Link href="/" className="lg:hidden flex items-center">
          <Image 
            src="/mytix-logo.png" 
            alt="Mytix" 
            width={110} 
            height={36} 
            priority 
            className="h-7 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Right Controls: User Profile Pill */}
      <div className="flex items-center gap-4">
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
