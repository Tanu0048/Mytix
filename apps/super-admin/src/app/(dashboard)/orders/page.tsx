"use client";

import { useState, useEffect } from "react";
import { Search, Download, ShoppingBag } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  const fetchAdminOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchAdminOrders();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "PENDING": return "bg-amber-50 text-amber-600 border-amber-200";
      case "FAILED": return "bg-red-50 text-red-600 border-red-200";
      case "CANCELLED": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  if (user?.role === "ORGANISER") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Orders
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            View orders and ticket sales for your events.
          </p>
        </header>

        <div className="rounded-2xl bg-white p-12 border border-slate-100 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h2>
          <p className="text-slate-500 font-medium mb-6">When customers buy tickets to your events, their orders will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-20">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Global Orders
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            View all ticket orders across the platform.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 shadow-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by Order ID or email..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-96">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-semibold">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-semibold">No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900 text-xs">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{order.user?.name || "Guest"}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{order.user?.email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 max-w-48 truncate" title={order.event?.title}>
                      {order.event?.title || "Unknown Event"}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {(order.totalCents / 100).toLocaleString('en-US', { style: 'currency', currency: order.currency || 'USD' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
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
