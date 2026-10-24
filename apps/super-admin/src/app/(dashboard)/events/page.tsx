"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Tag, 
  Clock, 
  Filter, 
  ChevronLeft,
  ChevronRight,
  MoreHorizontal, 
  Ticket, 
  Activity, 
  CalendarDays,
  Trash2,
  Edit2,
  Loader2,
  AlertTriangle,
  X,
  Search
} from "lucide-react";
import api from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function getFullImageUrl(path: string | undefined): string {
  if (!path) return "https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?w=800&q=80";
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path}`;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  
  // Filter & Search Controls (Frontend Hygiene)
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [upcomingEvents, setUpcomingEvents] = useState(0);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organiser/events");
      const list = res.data.data || [];
      setEvents(list);
      const currentTime = Date.now();
      const upcoming = list.filter((e: any) => e.startsAt && new Date(e.startsAt).getTime() > currentTime).length;
      setUpcomingEvents(upcoming);
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const [eventToDelete, setEventToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/organiser/events/${eventToDelete.id}`);
      const updated = events.filter((e) => e.id !== eventToDelete.id);
      setEvents(updated);
      setOpenActionId(null);
      setEventToDelete(null);
      showToast(`Event "${eventToDelete.title}" deleted successfully`);
    } catch (err: any) {
      console.error("Failed to delete event", err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "Failed to delete event";
      showToast(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculations for Stat Cards - 100% real from database
  const totalEvents = events.length;
  
  const calculatedSold = events.reduce((sum, e) => {
    const tierSold = e.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
    return sum + tierSold;
  }, 0);

  const calculatedRevenue = events.reduce((sum, e) => {
    const tierRev = e.ticketTypes?.reduce((s: number, t: any) => s + ((t.sold || 0) * (t.priceCents || 0) / 100), 0) || 0;
    return sum + tierRev;
  }, 0);

  // Filtered & Paginated Events
  const filteredEvents = events.filter((e) => {
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.venue?.name && e.venue.name.toLowerCase().includes(q)) ||
      (e.venue?.city && e.venue.city.toLowerCase().includes(q))
    );
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 max-w-7xl">
      
      {/* ===== Clean Standard Header ===== */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Event Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time statistics, active shows, and ticket capacity monitoring.
          </p>
        </div>
        <button 
          onClick={() => router.push("/events/create")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-xs hover:shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Create New Event</span>
        </button>
      </header>

      {/* ===== 4 Clean Stat Cards Row ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Events */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Events</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{totalEvents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Tickets Sold */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tickets Sold</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {calculatedSold.toLocaleString("en-AU")}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Revenue</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              ${calculatedRevenue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-base">
            $
          </div>
        </div>

        {/* Card 4: Upcoming */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Shows</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{upcomingEvents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/70 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ===== Dedicated Filter Bar Card (Reference Style) ===== */}
      <div className="rounded-xl bg-white p-5 border border-slate-200/90 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="h-4 w-4 text-amber-600" />
            <span>Filter Events</span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {paginatedEvents.length} of {filteredEvents.length} events (Page {currentPage} of {totalPages})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by event title, venue, or category..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-all"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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

      {/* ===== Main Event Management Table (Horizontal Scroll + Hygiene) ===== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Events List</h2>
          <span className="text-xs text-slate-400 font-medium">
            {filteredEvents.length} total records
          </span>
        </div>

        {/* Responsive Horizontal Scroll Wrapper */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[750px]">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Event Details</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Tickets Sold</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading events...</span>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No events found</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== "ALL" 
                        ? "No events match your current filter criteria." 
                        : "Get started by creating your very first event."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const eventDate = event.startsAt ? new Date(event.startsAt) : null;
                  const dateStr = eventDate 
                    ? eventDate.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                    : "TBA";
                  const timeStr = eventDate
                    ? eventDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })
                    : "--:--";

                  const totalTickets = event.ticketTypes?.reduce((s: number, t: any) => s + (t.quantity || 0), 0) || 0;
                  const soldTickets = event.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
                  const soldPercent = totalTickets > 0 ? Math.min(100, Math.round((soldTickets / totalTickets) * 100)) : 0;
                  const isDraft = event.status === "DRAFT";

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Column 1: Event Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/60 shrink-0">
                            <Image 
                              src={getFullImageUrl(event.posterPath)} 
                              alt={event.title} 
                              fill 
                              unoptimized
                              className="object-cover" 
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-snug">
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {event.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {event.venue.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-slate-400" />
                                {event.category || "General"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date & Time */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{dateStr}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{timeStr}</p>
                      </td>

                      {/* Column 3: Tickets Sold Progress */}
                      <td className="px-5 py-3.5">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                            <span>{soldTickets} <span className="text-slate-400 font-normal">/ {totalTickets}</span></span>
                            <span className="text-[10px] text-slate-500">{soldPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${soldPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isDraft 
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : event.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        }`}>
                          {event.status || "PUBLISHED"}
                        </span>
                      </td>

                      {/* Column 5: Actions */}
                      <td className="px-5 py-3.5 text-right relative">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => router.push(`/events/${event.id}/edit`)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEventToDelete(event)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Footer */}
        {filteredEvents.length > pageSize && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ===== Toast Notification ===== */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-800 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#F6C636] animate-pulse"></div>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ===== Delete Event Confirmation Modal ===== */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Event?</h3>
                <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-800">{eventToDelete.title}</strong>? This action cannot be undone.
                </p>

                <div className="mt-3 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-[11px] font-medium text-rose-700">
                  ⚠️ If tickets have already been issued for this event, deletion will be blocked by platform governance to protect attendees.
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
