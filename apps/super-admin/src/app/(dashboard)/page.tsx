"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Ticket, 
  Calendar, 
  MoreHorizontal, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Activity,
  ShoppingBag,
  Users,
  Filter,
  Search,
  Download
} from "lucide-react";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<any[]>([]);
  const [adminOrganisers, setAdminOrganisers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrganiserStats() {
      try {
        const res = await api.get("/organiser/events");
        setEvents(res.data.data || []);
      } catch (err) {
        console.error("Failed to load organiser stats", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (user?.role === "ORGANISER" || !user?.role) {
      loadOrganiserStats();
    } else if (user?.role === "ADMIN") {
      api.get("/admin/organisers")
        .then(res => setAdminOrganisers(res.data.data || []))
        .catch(err => console.error("Failed to load admin organisers", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // If ORGANISER or Default View
  if (user?.role === "ORGANISER" || !user?.role || user?.role !== "ADMIN") {
    const totalSales = events.reduce((sum, e) => {
      const tierRev = e.ticketTypes?.reduce((s: number, t: any) => s + ((t.sold || 0) * (t.priceCents || 0) / 100), 0) || 0;
      return sum + tierRev;
    }, 0);

    const ticketsSold = events.reduce((sum, e) => {
      const tierSold = e.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
      return sum + tierSold;
    }, 0);

    const currentTime = Date.now();
    const liveEvents = events.filter((e) => e.status === "PUBLISHED" && e.startsAt && new Date(e.startsAt).getTime() > currentTime).length;

    const firstName = user?.name?.split(" ")[0] || "Aman";

    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-7xl pb-20">
        
        {/* ===== Welcome Header with Decorative Script ===== */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span className="inline-block animate-wave origin-bottom-right">👋</span> Welcome, {firstName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Here is what&apos;s happening with your events today.
            </p>
          </div>

          {/* Decorative Handwritten Slogan */}
          <div className="hidden sm:block text-right select-none transform -rotate-2">
            <span className="text-slate-400/80 font-bold italic text-base tracking-wide block font-serif">
              Better Events
            </span>
            <span className="text-slate-400 font-extrabold italic text-sm tracking-wider block font-serif -mt-0.5">
              Bigger Moments
            </span>
            <div className="w-16 h-1 bg-amber-300/40 rounded-full ml-auto mt-0.5"></div>
          </div>
        </header>

        {/* ===== 3 Metric Cards Row ===== */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          
          {/* Card 1: Total Sales */}
          <div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-white via-white to-amber-50/30 p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600">
                <Ticket className="w-5 h-5 text-amber-600" />
              </div>
              <button className="text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  ₹{totalSales.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                  <span>↑ 0%</span> <span className="text-slate-400 font-medium">vs last 30 days</span>
                </p>
              </div>

              {/* Sparkline Curve Yellow */}
              <svg className="w-20 h-9 text-amber-400 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
                <path d="M2 28 Q 20 26, 32 16 T 62 8" />
              </svg>
            </div>
          </div>

          {/* Card 2: Tickets Sold */}
          <div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-white via-white to-blue-50/30 p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/50 flex items-center justify-center text-blue-600">
                <Ticket className="w-5 h-5 text-blue-600" />
              </div>
              <button className="text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tickets Sold</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {ticketsSold}
                </p>
                <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                  <span>↑ 0%</span> <span className="text-slate-400 font-medium">vs last 30 days</span>
                </p>
              </div>

              {/* Mini Bar Chart Visual Blue */}
              <div className="flex items-end gap-1 h-8 pb-1">
                <div className="w-1.5 h-3 bg-blue-200 rounded-xs"></div>
                <div className="w-1.5 h-4 bg-blue-300 rounded-xs"></div>
                <div className="w-1.5 h-6 bg-blue-400 rounded-xs"></div>
                <div className="w-1.5 h-8 bg-blue-500 rounded-xs"></div>
              </div>
            </div>
          </div>

          {/* Card 3: Live Events */}
          <div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-white via-white to-emerald-50/30 p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <button className="text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Events</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {liveEvents}
                </p>
                <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                  <span>↑ 0%</span> <span className="text-slate-400 font-medium">vs last 30 days</span>
                </p>
              </div>

              {/* Sparkline Curve Green */}
              <svg className="w-20 h-9 text-emerald-500 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
                <path d="M2 24 Q 22 28, 36 14 T 62 6" />
              </svg>
            </div>
          </div>

        </div>

        {/* ===== Main Illustration Empty State Card ===== */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-12 sm:p-20 text-center">
          
          {/* Subtle Ambient Glow Blobs */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-amber-100/50 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-amber-100/60 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

          <div className="relative z-10 max-w-md mx-auto flex flex-col items-center">
            
            {/* 3D-Style Calendar Icon with Gold Badge */}
            <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
              <div className="w-24 h-24 rounded-3xl bg-linear-to-b from-slate-50 to-slate-100 border-2 border-slate-200/80 shadow-lg flex flex-col overflow-hidden">
                {/* Calendar Header */}
                <div className="bg-amber-400 h-6 w-full flex items-center justify-around px-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
                </div>
                {/* Calendar Grid */}
                <div className="p-3 grid grid-cols-3 gap-1.5 opacity-40">
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                  <div className="h-1.5 bg-slate-400 rounded"></div>
                </div>
              </div>

              {/* Floating Golden Plus Badge */}
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-amber-400 border-2 border-white shadow-md flex items-center justify-center text-slate-950">
                <Plus className="w-5 h-5 stroke-3" />
              </div>

              {/* Sparkle Rays */}
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              No active events
            </h2>
            <p className="text-sm font-semibold text-slate-400 leading-relaxed max-w-sm mb-7">
              You haven&apos;t created any events yet. Get started by creating your first event!
            </p>

            {/* Create an Event Button */}
            <button
              onClick={() => router.push("/events/create")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-7 py-3.5 text-sm font-black text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-3" />
              <span>Create an Event</span>
              <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
            </button>

          </div>
        </div>

      </div>
    );
  }

  // ===== ADMIN DASHBOARD =====
  const stats = [
    { name: "Total Revenue", value: "₹1,24,563", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Tickets Sold", value: "8,432", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Active Organisers", value: "142", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Real-time statistics, active organisers, and platform management.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
            <Filter className="h-4 w-4" />
            <span>Filter Organisers</span>
          </div>
          <span className="text-sm font-semibold text-slate-400">Showing 5 of 142 organisers</span>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name, email, or status..." 
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
          />
        </div>

        {/* Organisers Table */}
        <div className="overflow-x-auto mt-6 border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Organiser Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminOrganisers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No organisers found.
                  </td>
                </tr>
              ) : (
                adminOrganisers.slice(0, 10).map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{org.user?.name || "Unknown"}</div>
                      <div className="text-xs text-slate-400">Joined {new Date(org.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">{org.user?.email || "No email"}</div>
                      <div className="text-xs text-slate-400">{org.user?.phone || "No phone"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        org.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                        org.status === "SUSPENDED" ? "bg-rose-100 text-rose-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => router.push("/organisers")}
                        className="text-amber-600 hover:text-amber-700 font-bold text-[13px] hover:underline cursor-pointer"
                      >
                        Manage &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {adminOrganisers.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => router.push("/organisers")}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              View all {adminOrganisers.length} organisers
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
