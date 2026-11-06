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
  LogOut,
  Image as ImageIcon,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  MapPin,
  FileText,
  Share2,
  BookOpen,
  QrCode
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isCollapsed: isCollapsedDesktop, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebarStore();
  // The mobile drawer always shows the full (expanded) menu
  const isCollapsed = isCollapsedDesktop && !isMobileOpen;
  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    closeMobile();
    // Navigate first so the dashboard doesn't flash while the session clears
    window.location.replace("/login");
    logout();
  };

  type NavItem = { name: string; href: string; icon: typeof LayoutDashboard };
  type NavGroup = { label: string | null; items: NavItem[] };

  const sellGroup: NavGroup = {
    label: "Sales",
    items: [
      { name: "Events", href: "/events", icon: CalendarDays },
      { name: "Orders", href: "/orders", icon: ShoppingBag },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  };

  const adminNavGroups: NavGroup[] = [
    { label: null, items: [{ name: "Overview", href: "/", icon: LayoutDashboard }] },
    sellGroup,
    {
      label: "Operations",
      items: [
        { name: "Organisers", href: "/organisers", icon: Users },
        { name: "Venues & cities", href: "/venues", icon: MapPin },
        { name: "Gate staff", href: "/staff", icon: QrCode },
      ],
    },
    {
      label: "Website",
      items: [
        { name: "Banners", href: "/banners", icon: ImageIcon },
        { name: "Categories", href: "/categories", icon: LayoutGrid },
        { name: "Website pages", href: "/pages", icon: BookOpen },
        { name: "Social links", href: "/social-links", icon: Share2 },
        { name: "Terms & conditions", href: "/terms", icon: FileText },
      ],
    },
    { label: null, items: [{ name: "Settings", href: "/settings", icon: Settings }] },
  ];

  const organiserNavGroups: NavGroup[] = [
    { label: null, items: [{ name: "Overview", href: "/", icon: LayoutDashboard }] },
    sellGroup,
    {
      label: "Operations",
      items: [
        { name: "Venues & cities", href: "/venues", icon: MapPin },
        { name: "Gate staff", href: "/staff", icon: QrCode },
      ],
    },
    { label: null, items: [{ name: "Settings", href: "/settings", icon: Settings }] },
  ];

  const navGroups = user?.role === "ADMIN" ? adminNavGroups : user?.role === "ORGANISER" ? organiserNavGroups : [];

  return (
    <>
    {isMobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
        onClick={closeMobile}
        aria-hidden="true"
      />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-50 border-r border-slate-200/80 bg-white flex flex-col justify-between transition-all duration-300 ease-in-out ${
        isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      } lg:translate-x-0 lg:shadow-none ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {/* Logo & Header */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-6 pb-4">
            <button
              onClick={toggleSidebar}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/80 p-1.5 shadow-sm transition-all cursor-pointer overflow-hidden"
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
            <Link href="/" onClick={closeMobile} className="flex items-center">
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
              onClick={isMobileOpen ? closeMobile : toggleSidebar}
              className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
              title={isMobileOpen ? "Close menu" : "Collapse sidebar"}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className={isCollapsed ? "px-2 mt-2" : "px-3 mt-2"}>
          {navGroups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? (isCollapsed ? "mt-2 pt-2 border-t border-slate-100" : "mt-5") : ""}>
          {group.label && !isCollapsed && (
            <p className="px-3 mb-1 text-xs font-medium text-slate-400">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
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
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        isActive ? "bg-amber-50 text-amber-700" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </Link>

                    {/* Floating Tooltip */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
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
                    onClick={closeMobile}
                    className={`group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 select-none ${
                      isActive
                        ? "bg-amber-50 text-amber-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          </div>
          ))}
        </nav>
      </div>

      {/* Bottom Promo Box & Sign Out */}
      {isCollapsed ? (
        <div className="p-3 flex flex-col items-center space-y-3 pb-6">
          {/* Mini Crown Button */}
          <div className="relative group">
            <button
              onClick={() => router.push("/events/create")}
              className="w-11 h-11 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 flex items-center justify-center text-amber-700 transition-all shadow-2xs cursor-pointer"
            >
              <Crown className="w-5 h-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
              Create Event
            </div>
          </div>

          {/* Mini Sign Out */}
          <div className="relative group">
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-xl border border-transparent hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50">
              Sign Out
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">


          {/* Sign Out Button */}
          <button 
            onClick={handleLogout}
            className="group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="mr-2.5 h-4 w-4 text-rose-500" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
