"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Users,
  ShoppingBag,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const adminNavItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Banners", href: "/banners", icon: ImageIcon },
    { name: "Organisers", href: "/organisers", icon: Users },
    { name: "Global Orders", href: "/orders", icon: ShoppingBag },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const organiserNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "My Events", href: "/events", icon: Ticket },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const navItems = user?.role === "ADMIN" ? adminNavItems : organiserNavItems;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white hidden lg:block">
      <div className="flex h-20 items-center px-8 border-b border-transparent">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Ticket className="h-5 w-5" />
        </div>
        <div className="ml-3 flex flex-col">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Mytix
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {user?.role === "ADMIN" ? "Admin Panel" : "Organiser Panel"}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between h-[calc(100vh-5rem)] p-4">
        <ul className="space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto mb-4">
          <button 
            onClick={handleLogout}
            className="group flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-400 transition-colors group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
