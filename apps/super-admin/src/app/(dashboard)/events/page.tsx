"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Plus, Calendar, MapPin, Tag, Edit2, Trash2 } from "lucide-react";
import api from "@/lib/api";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organiser/events");
      setEvents(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "DRAFT": return "bg-slate-100 text-slate-600 border-slate-200";
      case "CANCELLED": return "bg-red-50 text-red-600 border-red-200";
      case "POSTPONED": return "bg-amber-50 text-amber-600 border-amber-200";
      default: return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    try {
      await api.delete(`/organiser/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("Failed to delete event. It may have sales data.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Events
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Manage your concerts, shows, and ticketing tiers.
          </p>
        </div>
        <button 
          onClick={() => router.push("/events/create")}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" /> Create New Event
        </button>
      </header>

      <div className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search events..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
               <Filter className="h-4 w-4" /> Filter
             </button>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-96">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Event Details</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-semibold">Loading your events...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">No events found.</p>
                    <p className="text-slate-400 text-xs mt-1">You haven't created any events yet.</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {event.posterPath ? (
                          <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-100 shrink-0">
                            <img src={event.posterPath} alt={event.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-16 rounded-md overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-base">{event.title}</p>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="flex items-center text-xs font-semibold text-slate-500">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {event.venue?.name || "TBA"}
                            </span>
                            <span className="flex items-center text-xs font-semibold text-slate-500">
                              <Tag className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {event.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">
                        {new Date(event.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {new Date(event.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => router.push(`/events/${event.id}/edit`)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
