"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { Menu, PanelLeft } from "lucide-react";

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const { isCollapsed, toggleSidebar, setMobileOpen } = useSidebarStore();

  const roleLabel = user?.role === "ADMIN" ? "Administrator" : user?.role === "ORGANISER" ? "Organiser" : "";
  const displayName = user?.name?.trim() || user?.email || roleLabel;
  const displayRole = roleLabel;
  const initials = displayName
    ? displayName.split(/\s+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "MY";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
      
      {/* Left side: Toggle button and Mobile Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 cursor-pointer shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-semibold text-sm flex items-center justify-center border border-amber-200">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 leading-none mt-0.5 capitalize">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
