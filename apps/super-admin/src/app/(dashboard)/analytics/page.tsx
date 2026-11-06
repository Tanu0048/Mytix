"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  MapPin,
  Layers,
} from "lucide-react";
import api, { fetchAllPages } from "@/lib/api";
import { statusLabel } from "@/lib/format";
import { useAuthStore } from "@/store/useAuthStore";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any | null>(null);
  // Page-load timestamp (Date.now() must not be called during render)
  const [now] = useState(() => Date.now());

  const user = useAuthStore((state) => state.user);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const statsEndpoint = user?.role === "ADMIN" ? "/admin/stats" : "/organiser/stats";
      // /organiser/orders returns every order for ADMIN and only own orders for ORGANISER
      const [eventsRes, ordersRes, statsRes] = await Promise.allSettled([
        fetchAllPages("/organiser/events"),
        fetchAllPages("/organiser/orders"),
        api.get(statsEndpoint)
      ]);

      if (eventsRes.status === "fulfilled") {
        setEvents(eventsRes.value as any[]);
      }
      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value as any[]);
      }
      if (statsRes.status === "fulfilled") {
        setStatsData(statsRes.value.data.data || null);
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

  // Computed Metrics from real data (Aggregates with fallback)
  const totalRevenue = useMemo(() => {
    if (statsData?.totalGrossRevenueCents !== undefined) return statsData.totalGrossRevenueCents / 100;
    if (statsData?.totalSalesCents !== undefined) return statsData.totalSalesCents / 100;

    const ordersRev = orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o.totalCents || 0) / 100, 0);

    if (ordersRev > 0) return ordersRev;

    // Fallback computed from events ticket sold
    return events.reduce((sum, e) => {
      const eRev = e.ticketTypes?.reduce((s: number, t: any) => s + ((t.sold || 0) * (t.priceCents || 0) / 100), 0) || 0;
      return sum + eRev;
    }, 0);
  }, [orders, events, statsData]);

  const totalTicketsSold = useMemo(() => {
    if (statsData?.totalTicketsSold !== undefined) return statsData.totalTicketsSold;

    const ordersTix = orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o._count?.tickets || o.tickets?.length || 1), 0);

    if (ordersTix > 0) return ordersTix;

    return events.reduce((sum, e) => {
      const eTix = e.ticketTypes?.reduce((s: number, t: any) => s + (t.sold || 0), 0) || 0;
      return sum + eTix;
    }, 0);
  }, [orders, events, statsData]);

  const averageOrderValue = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === "PAID");
    if (paidOrders.length === 0) return totalTicketsSold > 0 ? (totalRevenue / totalTicketsSold) : 0;
    return totalRevenue / paidOrders.length;
  }, [orders, totalRevenue, totalTicketsSold]);

  const liveEventsCount = useMemo(() => {
    return events.filter((e) => e.status === "PUBLISHED" && (!e.startsAt || new Date(e.startsAt).getTime() > now)).length;
  }, [events, now]);

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
    <div className=" pb-24 relative max-w-7xl">

      {/* ===== HEADER ===== */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales and ticket performance across your events.
          </p>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
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
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div>
            <p className="text-[13px] text-slate-500">Gross Revenue</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[13px] text-slate-500 mt-1.5">
              Across all ticket orders
            </p>
          </div>
        </div>

        {/* Card 2: Tickets Issued */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div>
            <p className="text-[13px] text-slate-500">Tickets Issued</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {totalTicketsSold}
            </p>
            <p className="text-[13px] text-slate-500 mt-1.5">
              Live admission passes
            </p>
          </div>
        </div>

        {/* Card 3: Avg. Order Value */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div>
            <p className="text-[13px] text-slate-500">Avg. Order Value</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {formatCurrency(averageOrderValue)}
            </p>
            <p className="text-[13px] text-slate-500 mt-1.5">
              Per ticket transaction
            </p>
          </div>
        </div>

        {/* Card 4: Active Events */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div>
            <p className="text-[13px] text-slate-500">Active Events</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{liveEventsCount}</p>
            <p className="text-[13px] text-slate-500 mt-1.5">
              {events.length} total created
            </p>
          </div>
        </div>

      </div>

      {/* ===== REAL EVENT LEADERBOARD & TIER DISTRIBUTION (2 COLUMNS) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Top Events Leaderboard (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Top Performing Events</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Ranked by live ticket sales volume and capacity utilization.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold">
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
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-amber-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100/90 border border-amber-200/80 text-amber-950 font-semibold text-sm flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{event.title}</p>
                          <p className="text-[13px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {event.venue?.name || "Venue"} ({event.venue?.city || "City"})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-slate-900 block">{formatCurrency(tierRev)}</span>
                          <span className="text-xs text-slate-400 font-semibold">{sold} / {total} sold</span>
                        </div>

                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                          event.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-slate-100 text-slate-700"
                        }`}>
                          {statusLabel(event.status)}
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
        <div className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-slate-900">Tier Distribution</h2>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-6">
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
                      <span className="font-semibold text-slate-700">{tier.name}</span>
                      <span className="font-semibold text-slate-900">{tier.count} tix ({tier.pct}%)</span>
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
        </div>
      </div>

      {/* ===== ROW 3: RECENT COMPLETED ORDERS STREAM ===== */}
      <div className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Completed Orders</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Live stream of verified attendee purchases from the booking gateway.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[13px] font-semibold border border-emerald-200/80">
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
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {order.user?.name || order.guestName || "Customer"}
                    </p>
                    <p className="text-[13px] text-slate-400">
                      {order.event?.title || "Event Booking"} &bull; {order.user?.email || order.guestEmail || ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency((order.totalCents || 0) / 100)}
                    </p>
                    <p className="text-[13px] text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Paid
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
