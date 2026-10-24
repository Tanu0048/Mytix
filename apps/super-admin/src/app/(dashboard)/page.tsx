"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Ticket, 
  Calendar, 
  Plus, 
  ArrowRight, 
  Activity, 
  ShoppingBag, 
  Users, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  Clock3
} from "lucide-react";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<any[]>([]);
  const [adminOrganisers, setAdminOrganisers] = useState<any[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Organiser Event Table Controls (Frontend Hygiene)
  const [orgEventSearch, setOrgEventSearch] = useState("");
  const [orgEventStatus, setOrgEventStatus] = useState("ALL");
  const [orgEventPage, setOrgEventPage] = useState(1);
  const orgEventPageSize = 5;

  // Admin Organisers Table Controls (Frontend Hygiene)
  const [orgSearch, setOrgSearch] = useState("");
  const [adminOrgStatus, setAdminOrgStatus] = useState("ALL");
  const [adminOrgPage, setAdminOrgPage] = useState(1);
  const adminOrgPageSize = 10;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        if (user?.role === "ORGANISER" || !user?.role) {
          const res = await api.get("/organiser/events");
          setEvents(res.data.data || []);
        } else if (user?.role === "ADMIN") {
          const [orgsRes, ordersRes] = await Promise.allSettled([
            api.get("/admin/organisers"),
            api.get("/admin/orders").catch(() => api.get("/organiser/orders"))
          ]);
          if (orgsRes.status === "fulfilled") {
            setAdminOrganisers(orgsRes.value.data.data || []);
          }
          if (ordersRes.status === "fulfilled") {
            setAdminOrders(ordersRes.value.data.data || []);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  // ==========================================
  // ORGANISER VIEW
  // ==========================================
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

    // Filtering & Pagination for Organiser Events
    const filteredOrgEvents = events.filter((e) => {
      const matchesSearch = !orgEventSearch || 
        (e.title && e.title.toLowerCase().includes(orgEventSearch.toLowerCase())) ||
        (e.category && e.category.toLowerCase().includes(orgEventSearch.toLowerCase())) ||
        (e.venue?.name && e.venue.name.toLowerCase().includes(orgEventSearch.toLowerCase())) ||
        (e.venue?.city && e.venue.city.toLowerCase().includes(orgEventSearch.toLowerCase()));

      const matchesStatus = orgEventStatus === "ALL" || e.status === orgEventStatus;
      return matchesSearch && matchesStatus;
    });

    const totalOrgEventPages = Math.max(1, Math.ceil(filteredOrgEvents.length / orgEventPageSize));
    const paginatedOrgEvents = filteredOrgEvents.slice(
      (orgEventPage - 1) * orgEventPageSize,
      orgEventPage * orgEventPageSize
    );

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-7xl pb-20">
        
        {/* ===== Clean Standard Header ===== */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome, {firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time statistics, active shows, and event ticketing management.
            </p>
          </div>
          <button
            onClick={() => router.push("/events/create")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-xs hover:shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create an Event</span>
          </button>
        </header>

        {/* ===== Clean Metric Cards (Reference Inspired) ===== */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          
          {/* Card 1: Total Sales */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sales
              </p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                ${totalSales.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Tickets Sold */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tickets Sold
              </p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {ticketsSold.toLocaleString("en-AU")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Live Events */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Live Events
              </p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                {liveEvents}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* ===== Events Section: Empty State or Clean Data Table ===== */}
        {events.length === 0 && !isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">No active events</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              You haven&apos;t created any events yet. Get started by creating your first event to sell tickets.
            </p>
            <button
              onClick={() => router.push("/events/create")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-2.5 text-xs font-bold text-slate-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create an Event</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Filter Card matching reference design */}
            <div className="rounded-xl bg-white p-5 border border-slate-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Filter className="h-4 w-4 text-amber-600" />
                  <span>Filter Events</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Showing {paginatedOrgEvents.length} of {filteredOrgEvents.length} events (Page {orgEventPage} of {totalOrgEventPages})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orgEventSearch}
                    onChange={(e) => { setOrgEventSearch(e.target.value); setOrgEventPage(1); }}
                    placeholder="Search by event title, venue, or category..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <select
                    value={orgEventStatus}
                    onChange={(e) => { setOrgEventStatus(e.target.value); setOrgEventPage(1); }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Events List Table (Horizontal Scrollable + Clean Pagination) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Events List</h2>
                <button
                  onClick={() => router.push("/events")}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                >
                  View All Events &rarr;
                </button>
              </div>

              {/* Responsive Horizontal Scroll Wrapper */}
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5">Event Details</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Venue & Location</th>
                      <th className="px-5 py-3.5">Tickets Sold</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                          Loading events...
                        </td>
                      </tr>
                    ) : paginatedOrgEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                          No events match your current filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedOrgEvents.map((event) => {
                        const eventDate = event.startsAt ? new Date(event.startsAt) : null;
                        const dateStr = eventDate 
                          ? eventDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                          : "TBA";

                        const totalTickets = event.ticketTypes?.reduce((s: number, t: any) => s + (t.quantity || 0), 0) || 0;
                        const soldTickets = event.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;

                        return (
                          <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-slate-900">{event.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{dateStr}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                                {event.category || "Concert"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-800">{event.venue?.name || "TBA"}</p>
                              <p className="text-[11px] text-slate-400">{event.venue?.city || "Australia"}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-900">{soldTickets}</span>
                              <span className="text-slate-400"> / {totalTickets}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                event.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                                event.status === "DRAFT" ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => router.push(`/events/${event.id}/edit`)}
                                className="text-amber-600 hover:text-amber-700 font-semibold text-xs hover:underline cursor-pointer"
                              >
                                Edit &rarr;
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Clean Pagination Footer */}
              {filteredOrgEvents.length > orgEventPageSize && (
                <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing {(orgEventPage - 1) * orgEventPageSize + 1} to {Math.min(orgEventPage * orgEventPageSize, filteredOrgEvents.length)} of {filteredOrgEvents.length} events
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setOrgEventPage((p) => Math.max(1, p - 1))}
                      disabled={orgEventPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      Page {orgEventPage} of {totalOrgEventPages}
                    </span>
                    <button
                      onClick={() => setOrgEventPage((p) => Math.min(totalOrgEventPages, p + 1))}
                      disabled={orgEventPage === totalOrgEventPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // ADMIN DASHBOARD VIEW
  // ==========================================
  const adminTotalRevenue = adminOrders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + (o.totalCents || 0) / 100, 0);

  const adminTicketsSold = adminOrders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + (o._count?.tickets || o.tickets?.length || 1), 0);

  const stats = [
    { 
      name: "Total Gross Revenue", 
      value: `$${adminTotalRevenue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: Activity, 
      color: "text-amber-600", 
      bg: "bg-amber-50",
      border: "border-amber-200/70"
    },
    { 
      name: "Tickets Sold", 
      value: adminTicketsSold.toLocaleString("en-AU"), 
      icon: ShoppingBag, 
      color: "text-blue-600", 
      bg: "bg-blue-50",
      border: "border-blue-200/70"
    },
    { 
      name: "Active Organisers", 
      value: adminOrganisers.length.toString(), 
      icon: Users, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50",
      border: "border-emerald-200/70"
    },
  ];

  const filteredAdminOrganisers = adminOrganisers.filter(org => {
    const q = orgSearch.toLowerCase();
    const matchesSearch = !orgSearch || (
      (org.businessName && org.businessName.toLowerCase().includes(q)) ||
      (org.user?.name && org.user.name.toLowerCase().includes(q)) ||
      (org.user?.email && org.user.email.toLowerCase().includes(q))
    );
    const matchesStatus = adminOrgStatus === "ALL" || org.status === adminOrgStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAdminOrgPages = Math.max(1, Math.ceil(filteredAdminOrganisers.length / adminOrgPageSize));
  const paginatedAdminOrgs = filteredAdminOrganisers.slice(
    (adminOrgPage - 1) * adminOrgPageSize,
    adminOrgPage * adminOrgPageSize
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-7xl pb-20">
      
      {/* Clean Standard Admin Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time statistics, active organisers, and platform management.
        </p>
      </header>

      {/* Clean Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{stat.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="rounded-xl bg-white p-5 border border-slate-200/90 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="h-4 w-4 text-amber-600" />
            <span>Filter Organisers</span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {paginatedAdminOrgs.length} of {filteredAdminOrganisers.length} organisers (Page {adminOrgPage} of {totalAdminOrgPages})
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={orgSearch}
              onChange={(e) => { setOrgSearch(e.target.value); setAdminOrgPage(1); }}
              placeholder="Search by organiser name, business, or email..." 
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-all"
            />
          </div>

          <div>
            <select
              value={adminOrgStatus}
              onChange={(e) => { setAdminOrgStatus(e.target.value); setAdminOrgPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active / Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organisers Table with Horizontal Scroll & Pagination */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Organisers Directory</h2>
          <button 
            onClick={() => router.push("/organisers")}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
          >
            Manage All Organisers &rarr;
          </button>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Organiser Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 font-medium">
                    Loading organisers...
                  </td>
                </tr>
              ) : paginatedAdminOrgs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 font-medium">
                    {orgSearch ? "No organisers match your search." : "No organisers found."}
                  </td>
                </tr>
              ) : (
                paginatedAdminOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{org.user?.name || org.businessName || "Unknown"}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Joined {new Date(org.createdAt).toLocaleDateString("en-AU")}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{org.user?.email || "No email"}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{org.user?.phone || "No phone"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        org.status === "ACTIVE" || org.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                        org.status === "SUSPENDED" ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button 
                        onClick={() => router.push("/organisers")}
                        className="text-amber-600 hover:text-amber-700 font-semibold text-xs hover:underline cursor-pointer"
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
        
        {/* Pagination Bar */}
        {filteredAdminOrganisers.length > adminOrgPageSize && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(adminOrgPage - 1) * adminOrgPageSize + 1} to {Math.min(adminOrgPage * adminOrgPageSize, filteredAdminOrganisers.length)} of {filteredAdminOrganisers.length} organisers
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAdminOrgPage((p) => Math.max(1, p - 1))}
                disabled={adminOrgPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {adminOrgPage} of {totalAdminOrgPages}
              </span>
              <button
                onClick={() => setAdminOrgPage((p) => Math.min(totalAdminOrgPages, p + 1))}
                disabled={adminOrgPage === totalAdminOrgPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
