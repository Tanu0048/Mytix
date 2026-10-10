"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Download, 
  ShoppingBag, 
  DollarSign, 
  Ticket, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  Eye, 
  RefreshCw,
  ExternalLink,
  ChevronDown,
  X,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Copy,
  Check
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);

  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
      // Try organiser orders first, fallback to admin orders
      let res;
      try {
        res = await api.get("/organiser/orders");
      } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 403) {
          res = await api.get("/admin/orders");
        } else {
          throw err;
        }
      }
      setOrders(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Copy order ID helper
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        order.orderNumber?.toLowerCase().includes(q) ||
        order.user?.name?.toLowerCase().includes(q) ||
        order.user?.email?.toLowerCase().includes(q) ||
        order.event?.title?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, statusFilter, searchQuery]);

  // Derived Metrics
  const totalOrdersCount = orders.length;
  
  const totalRevenueCents = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o.totalCents || 0), 0);
  }, [orders]);

  const totalTicketsSold = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + (o._count?.tickets || o.tickets?.length || 1), 0);
  }, [orders]);

  const paidOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "PAID").length;
  }, [orders]);

  const successRate = totalOrdersCount > 0 
    ? Math.round((paidOrdersCount / totalOrdersCount) * 100) 
    : 100;

  // Format Currency
  const formatCurrency = (cents: number, currency: string = "INR") => {
    const symbol = currency === "INR" ? "₹" : "$";
    return `${symbol}${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format Date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order Number,Customer Name,Customer Email,Event Title,Tickets,Total Amount,Status,Date"];
    const rows = filteredOrders.map((o) => {
      const ticketsCount = o._count?.tickets || o.tickets?.length || 1;
      const amount = (o.totalCents / 100).toFixed(2);
      const cleanEventTitle = `"${(o.event?.title || "").replace(/"/g, '""')}"`;
      const cleanName = `"${(o.user?.name || "Guest").replace(/"/g, '""')}"`;
      return `${o.orderNumber},${cleanName},${o.user?.email || ""},${cleanEventTitle},${ticketsCount},${amount},${o.status},${new Date(o.createdAt).toISOString()}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Styling Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            PAID
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            PENDING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            FAILED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 pb-24 relative">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-200/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ===== HEADER ===== */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200/60 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
              Real-time Ledger
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Orders & <span className="text-amber-500">Sales</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Track customer ticket orders, transactions, and payment statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : "text-slate-400"}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-3 text-sm font-extrabold text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* ===== 4 STAT CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Orders */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
            </div>
            <svg className="w-16 h-8 text-amber-400 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
              <path d="M2 26 Q 20 22, 32 14 T 62 6" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalOrdersCount}</p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
              <span>↑ Live</span> <span className="text-slate-400 font-medium">all events</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 border border-emerald-200/60 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <svg className="w-16 h-8 text-emerald-400 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
              <path d="M2 28 Q 18 18, 36 20 T 62 4" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {formatCurrency(totalRevenueCents)}
            </p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
              <span>↑ Paid</span> <span className="text-slate-400 font-medium">net sales</span>
            </p>
          </div>
        </div>

        {/* Card 3: Tickets Sold */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-amber-600" />
            </div>
            <svg className="w-16 h-8 text-amber-400 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
              <path d="M2 22 Q 22 28, 40 12 T 62 8" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tickets Sold</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalTicketsSold}</p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
              <span>↑ Issued</span> <span className="text-slate-400 font-medium">to attendees</span>
            </p>
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group hover:border-amber-200/80 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 border border-blue-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <svg className="w-16 h-8 text-blue-400 stroke-current fill-none stroke-[2.5]" viewBox="0 0 64 32">
              <path d="M2 18 Q 24 10, 42 16 T 62 6" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checkout Success</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{successRate}%</p>
            <p className="text-[11px] font-bold text-blue-600 mt-1.5 flex items-center gap-1">
              <span>{paidOrdersCount} Paid</span> <span className="text-slate-400 font-medium">out of {totalOrdersCount}</span>
            </p>
          </div>
        </div>

      </div>

      {/* ===== SEARCH & FILTER BAR ===== */}
      <div className="bg-white rounded-3xl p-5 mb-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer name, email, or event..."
            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {["ALL", "PAID", "PENDING", "FAILED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === status
                  ? "bg-[#FFF9EB] text-amber-950 border border-amber-300/80 shadow-2xs font-extrabold"
                  : "text-slate-500 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {status === "ALL" ? "All Orders" : status}
            </button>
          ))}
        </div>

      </div>

      {/* ===== ORDERS TABLE ===== */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-4 pl-6 pr-4">Order ID</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">Event</th>
                <th className="py-4 px-4">Tickets</th>
                <th className="py-4 px-4">Amount</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 pl-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center animate-spin">
                        <RefreshCw className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Loading orders ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto p-6">
                      <div className="w-16 h-16 rounded-3xl bg-amber-50/80 border border-amber-200/50 flex items-center justify-center mb-4 text-amber-600 shadow-2xs">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-black text-slate-900 mb-1">No Orders Found</h3>
                      <p className="text-sm font-semibold text-slate-400 text-center leading-relaxed mb-4">
                        {searchQuery || statusFilter !== "ALL"
                          ? "No orders match your filter criteria. Try clearing search or selecting a different status."
                          : "When customers purchase tickets for your events, order records and payment confirmations will appear here."}
                      </p>
                      {(searchQuery || statusFilter !== "ALL") && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-amber-900 bg-[#FFF9EB] border border-amber-200 hover:bg-amber-100/70 transition-all cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const ticketsCount = order._count?.tickets || order.tickets?.length || 1;
                  const initials = (order.user?.name || "G")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Order ID */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">
                            {order.orderNumber}
                          </span>
                          <button
                            onClick={(e) => handleCopyId(order.orderNumber, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200/60 rounded-md text-slate-400 hover:text-slate-700"
                            title="Copy Order ID"
                          >
                            {copiedId === order.orderNumber ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100/80 border border-amber-200/80 text-amber-900 font-black text-[11px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {order.user?.name || "Guest Customer"}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">
                              {order.user?.email || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-4">
                        <div className="min-w-0 max-w-50">
                          <p className="font-bold text-slate-900 truncate" title={order.event?.title}>
                            {order.event?.title || "Special Event"}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                            {order.event?.venue?.name || "Venue"} ({order.event?.venue?.city || "City"})
                          </p>
                        </div>
                      </td>

                      {/* Tickets Count */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]">
                          <Ticket className="w-3 h-3 text-slate-400" />
                          {ticketsCount} {ticketsCount === 1 ? "Ticket" : "Tickets"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-black text-slate-900">
                        {formatCurrency(order.totalCents, order.currency)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-4 pr-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#FFF9EB] hover:text-amber-900 hover:border-amber-200 border border-transparent text-slate-600 transition-all shadow-2xs cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {filteredOrders.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-slate-400">
            <span>Showing {filteredOrders.length} of {orders.length} orders</span>
            <span>Total Value: <strong className="text-slate-800">{formatCurrency(filteredOrders.reduce((s, o) => s + (o.totalCents || 0), 0))}</strong></span>
          </div>
        )}
      </div>

      {/* ===== ORDER DETAILS MODAL ===== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Order Details
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-slate-500">
                      {selectedOrder.orderNumber}
                    </span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              
              {/* Customer Box */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer Information
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Name</span>
                  <span className="font-bold text-slate-900">{selectedOrder.user?.name || "Guest Attendee"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Email</span>
                  <span className="font-bold text-slate-900">{selectedOrder.user?.email || "N/A"}</span>
                </div>
                {selectedOrder.user?.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-500">Phone</span>
                    <span className="font-bold text-slate-900">{selectedOrder.user.phone}</span>
                  </div>
                )}
              </div>

              {/* Event Box */}
              <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Event & Venue
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Event</span>
                  <span className="font-bold text-slate-900">{selectedOrder.event?.title || "Special Event"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Venue</span>
                  <span className="font-bold text-slate-900">
                    {selectedOrder.event?.venue?.name || "Venue"}, {selectedOrder.event?.venue?.city || "City"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">Event Date</span>
                  <span className="font-bold text-slate-900">{formatDate(selectedOrder.event?.startsAt)}</span>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="p-4 rounded-2xl bg-[#FFF9EB]/60 border border-amber-200/70 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Summary
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Tickets Quantity</span>
                  <span className="font-bold text-slate-900">
                    {selectedOrder._count?.tickets || selectedOrder.tickets?.length || 1} Tickets
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Base Ticket Price</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(selectedOrder.ticketTotalCents || selectedOrder.totalCents, selectedOrder.currency)}
                  </span>
                </div>
                {selectedOrder.buyerFeeCents > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">Processing Fee</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(selectedOrder.buyerFeeCents, selectedOrder.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-base">
                  <span className="font-black text-slate-900">Total Charged</span>
                  <span className="font-black text-amber-950 text-base">
                    {formatCurrency(selectedOrder.totalCents, selectedOrder.currency)}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
