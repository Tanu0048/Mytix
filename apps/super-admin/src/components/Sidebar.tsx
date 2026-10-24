"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  Settings,
  Crown,
  ArrowRight,
  LogOut,
  Image as ImageIcon,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  MapPin,
  FileText,
  Share2,
  BookOpen
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const adminNavItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Events", href: "/events", icon: CalendarDays },
    { name: "Venues & Cities", href: "/venues", icon: MapPin },
    { name: "Banners", href: "/banners", icon: ImageIcon },
    { name: "Organisers", href: "/organisers", icon: Users },
    { name: "Categories", href: "/categories", icon: LayoutGrid },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Terms & Legal", href: "/terms", icon: FileText },
    { name: "Social Links", href: "/social-links", icon: Share2 },
    { name: "Pages CMS", href: "/pages", icon: BookOpen },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const organiserNavItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Events", href: "/events", icon: CalendarDays },
    { name: "Venues & Cities", href: "/venues", icon: MapPin },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const navItems = user?.role === "ADMIN" ? adminNavItems : organiserNavItems;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 border-r border-slate-100 bg-white hidden lg:flex lg:flex-col justify-between transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {/* Logo & Header */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-6 pb-4">
            <button
              onClick={toggleSidebar}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/80 p-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer overflow-hidden"
              title="Expand menu (Mytix)"
            >
              <Image 
                src="/mytix-logo.png" 
                alt="Mytix" 
                width={36} 
                height={36} 
                className="w-full h-full object-contain"
              />
            </button>
            <button
              onClick={toggleSidebar}
              className="mt-2.5 p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 pt-7 pb-6">
            <Link href="/" className="flex items-center">
              <Image 
                src="/mytix-logo.png" 
                alt="Mytix" 
                width={130} 
                height={42} 
                priority
                className="h-8.5 w-auto object-contain"
              />
            </Link>

            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className={isCollapsed ? "px-2 mt-2" : "px-4 mt-3"}>
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              if (isCollapsed) {
                return (
                  <li key={item.name} className="relative group flex justify-center">
                    <Link
                      href={item.href}
                      scroll={false}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200 ease-in-out active:scale-95 ${
                        isActive
                          ? "bg-[#FFF9EB] text-amber-600 border-amber-300/80 shadow-2xs font-extrabold"
                          : "text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isActive ? "text-amber-500 scale-110" : "group-hover:scale-110 group-hover:text-slate-700"
                        }`}
                      />
                    </Link>

                    {/* Floating Tooltip */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
                      {item.name}
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.name} className="relative">
                  <Link
                    href={item.href}
                    scroll={false}
                    className={`group relative flex items-center rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 select-none ${
                      isActive
                        ? "bg-amber-50 text-amber-900 border border-amber-200/70"
                        : "text-slate-600 border border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${
                        isActive ? "text-amber-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom Promo Box & Sign Out */}
      {isCollapsed ? (
        <div className="p-3 flex flex-col items-center space-y-3 pb-6">
          {/* Mini Crown Button */}
          <div className="relative group">
            <button
              onClick={() => router.push("/events/create")}
              className="w-11 h-11 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 flex items-center justify-center text-amber-700 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Crown className="w-5 h-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
              Create Event
            </div>
          </div>

          {/* Mini Sign Out */}
          <div className="relative group">
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-2xl border border-transparent hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
              Sign Out
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">


          {/* Sign Out Button */}
          <button 
            onClick={handleLogout}
            className="group flex w-full items-center rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="mr-2.5 h-4 w-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
