"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  Ticket, 
  Calendar, 
  ArrowUpRight, 
  RefreshCw,
  ShoppingBag,
  MapPin,
  Layers,
  Sparkles,
  TrendingUp,
  CreditCard,
  User,
  Clock
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const user = useAuthStore((state) => state.user);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [eventsRes, ordersRes] = await Promise.allSettled([
        api.get("/organiser/events"),
        api.get("/organiser/orders").catch(() => api.get("/admin/orders"))
      ]);

      if (eventsRes.status === "fulfilled") {
        setEvents(eventsRes.value.data.data || []);
      }
      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Computed Metrics from real data
  const totalRevenue = useMemo(() => {
    const ordersRev = orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o.totalCents || 0) / 100, 0);

    if (ordersRev > 0) return ordersRev;

    // Fallback computed from events ticket sold
    return events.reduce((sum, e) => {
      const eRev = e.ticketTypes?.reduce((s: number, t: any) => s + ((t.sold || 0) * (t.priceCents || 0) / 100), 0) || 0;
      return sum + eRev;
    }, 0);
  }, [orders, events]);

  const totalTicketsSold = useMemo(() => {
    const ordersTix = orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o._count?.tickets || o.tickets?.length || 1), 0);

    if (ordersTix > 0) return ordersTix;

    return events.reduce((sum, e) => {
      const eTix = e.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
      return sum + eTix;
    }, 0);
  }, [orders, events]);

  const averageOrderValue = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === "PAID");
    if (paidOrders.length === 0) return totalTicketsSold > 0 ? (totalRevenue / totalTicketsSold) : 0;
    return totalRevenue / paidOrders.length;
  }, [orders, totalRevenue, totalTicketsSold]);

  const liveEventsCount = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => e.status === "PUBLISHED" && (!e.startsAt || new Date(e.startsAt).getTime() > now)).length;
  }, [events]);

  // Ticket Tiers Distribution (Calculated 100% dynamically from events)
  const tierDistribution = useMemo(() => {
    const tiersMap: Record<string, { count: number; revenue: number }> = {};
    events.forEach(e => {
      e.ticketTypes?.forEach((t: any) => {
        const name = t.name || "General Admission";
        if (!tiersMap[name]) {
          tiersMap[name] = { count: 0, revenue: 0 };
        }
        const sold = t.sold || 0;
        tiersMap[name].count += sold;
        tiersMap[name].revenue += (sold * (t.priceCents || 0)) / 100;
      });
    });

    const entries = Object.entries(tiersMap);
    if (entries.length === 0) {
      return [];
    }

    const totalSold = entries.reduce((s, [, v]) => s + v.count, 0) || 1;
    const colors = ["bg-amber-400", "bg-emerald-400", "bg-blue-400", "bg-purple-400", "bg-rose-400"];
    return entries.map(([name, val], idx) => ({
      name,
      count: val.count,
      revenue: val.revenue,
      pct: Math.round((val.count / totalSold) * 100) || 0,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.count - a.count);
  }, [events]);

  // Top events sorted by tickets sold
  const topEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const soldA = a.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
      const soldB = b.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
      return soldB - soldA;
    });
  }, [events]);

  // Paid orders list
  const recentPaidOrders = useMemo(() => {
    return orders.filter(o => o.status === "PAID").slice(0, 5);
  }, [orders]);

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 pb-24 relative max-w-7xl">
      {/* Ambient decorative glow */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ===== HEADER ===== */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200/60 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
              Live Metrics
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Performance & <span className="text-amber-500">Analytics</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Real-time insights aggregated directly from your event bookings and ticket sales.
          </p>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-amber-600" : "text-slate-400"}`} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </header>

      {/* ===== 4 REAL SUMMARY METRIC CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Gross Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <span className="flex items-center text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              Verified
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
              Across all ticket orders
            </p>
          </div>
        </div>

        {/* Card 2: Tickets Issued */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 border border-emerald-200/60 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="flex items-center text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              Scannable
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tickets Issued</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {totalTicketsSold}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
              Live admission passes
            </p>
          </div>
        </div>

        {/* Card 3: Avg. Order Value */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 border border-blue-200/60 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
              Avg Basket
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg. Order Value</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {formatCurrency(averageOrderValue)}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
              Per ticket transaction
            </p>
          </div>
        </div>

        {/* Card 4: Active Events */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <span className="flex items-center text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
              Live
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Events</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{liveEventsCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
              {events.length} total created
            </p>
          </div>
        </div>

      </div>

      {/* ===== REAL EVENT LEADERBOARD & TIER DISTRIBUTION (2 COLUMNS) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Top Events Leaderboard (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-black text-slate-900">Top Performing Events</h2>
                <p className="text-sm font-semibold text-slate-400 mt-0.5">
                  Ranked by live ticket sales volume and capacity utilization.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {events.length} Total Shows
              </span>
            </div>

            <div className="space-y-3.5">
              {topEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-semibold">
                  No event records found. Create events to track ticket velocity.
                </div>
              ) : (
                topEvents.slice(0, 5).map((event, idx) => {
                  const sold = event.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
                  const total = event.ticketTypes?.reduce((s: number, t: any) => s + (t.quantity || 100), 0) || 100;
                  const pct = Math.min(100, Math.round((sold / total) * 100));
                  const tierRev = event.ticketTypes?.reduce((s: number, t: any) => s + ((t.sold || 0) * (t.priceCents || 0) / 100), 0) || 0;

                  return (
                    <div 
                      key={event.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-[#FFF9EB]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100/90 border border-amber-200/80 text-amber-950 font-black text-sm flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 line-clamp-1">{event.title}</p>
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {event.venue?.name || "Venue"} ({event.venue?.city || "City"})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">{formatCurrency(tierRev)}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{sold} / {total} sold</span>
                        </div>

                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          event.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-slate-100 text-slate-700"
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Side Card: Real Ticket Tier Breakdown */}
        <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-slate-900">Tier Distribution</h2>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-400 mb-6">
              Actual sales share by ticket category across all events.
            </p>

            {/* Distribution bars */}
            {tierDistribution.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm font-semibold">
                No ticket tier sales recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {tierDistribution.map((tier, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700">{tier.name}</span>
                      <span className="font-black text-slate-900">{tier.count} tix ({tier.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${tier.color}`}
                        style={{ width: `${tier.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <div className="p-4 rounded-2xl bg-[#FFF9EB] border border-amber-200/70 mt-6">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-950">Dynamic Calculation</p>
                <p className="text-[11px] font-medium text-amber-900/80 mt-0.5 leading-relaxed">
                  These metrics reflect live purchases stored in your database.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ===== ROW 3: RECENT COMPLETED ORDERS STREAM ===== */}
      <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Completed Orders</h2>
            <p className="text-sm font-semibold text-slate-400 mt-0.5">
              Live stream of verified attendee purchases from the booking gateway.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
            {recentPaidOrders.length} Recent Paid
          </span>
        </div>

        <div className="space-y-3">
          {recentPaidOrders.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm font-semibold">
              No completed orders yet.
            </div>
          ) : (
            recentPaidOrders.map((order) => (
              <div 
                key={order.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {order.user?.name || order.guestName || "Customer"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.event?.title || "Event Booking"} &bull; {order.user?.email || order.guestEmail || ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-black text-slate-900">
                      {formatCurrency((order.totalCents || 0) / 100)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    PAID
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
