"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Users, ShoppingBag, Activity, Filter, Search, Download, Calendar, Ticket } from "lucide-react";

export default function Home() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "ORGANISER") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome, {user.name}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Here is what's happening with your events today.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Total Sales</p>
              <p className="text-4xl font-black text-slate-900">₹0</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Activity className="h-6 w-6" /></div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Tickets Sold</p>
              <p className="text-4xl font-black text-slate-900">0</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Ticket className="h-6 w-6" /></div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Live Events</p>
              <p className="text-4xl font-black text-slate-900">0</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Calendar className="h-6 w-6" /></div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-12 border border-slate-100 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No active events</h2>
          <p className="text-slate-500 font-medium mb-6">You haven't created any events yet. Get started by creating your first event!</p>
          <a href="/events" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
            Create an Event
          </a>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD
  const stats = [
    { name: "Total Revenue", value: "$124,563", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Tickets Sold", value: "8,432", icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Active Organisers", value: "142", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Platform Overview
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Real-time statistics, active organisers, and platform management.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">{stat.name}</p>
                <p className="text-4xl font-black text-slate-900">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <Filter className="h-5 w-5" />
            <span>Filter Organisers</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Showing 5 of 142 organisers</span>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business name, email, or status..." 
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">Status</label>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
              <option>All Statuses</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">Sort by Date</label>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-lg font-extrabold text-slate-900">Recent Organisers</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-96">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Events</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">Acme Events Co.</div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">Joined Oct 2026</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-700">contact@acme.com</div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">+1 234 567 890</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">12</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-200">
                      Approved
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="font-bold text-blue-600 hover:text-blue-800 transition-colors">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
