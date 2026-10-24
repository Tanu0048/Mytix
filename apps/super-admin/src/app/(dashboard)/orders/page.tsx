"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Download, 
  ShoppingBag, 
  DollarSign, 
  Ticket, 
  CheckCircle2, 
  Eye, 
  RefreshCw,
  X,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Copy,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight
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

  // Pagination Controls (Frontend Hygiene)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const user = useAuthStore((state) => state.user);

  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
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

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredOrders, currentPage, pageSize]);

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
    const symbol = "$";
    return `${symbol}${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format Date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            PAID
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            PENDING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
            FAILED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 max-w-7xl">

      {/* ===== CLEAN HEADER ===== */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Orders & Sales
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time customer transactions, payment settlements, and order history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : "text-slate-400"}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Excel / CSV</span>
          </button>
        </div>
      </header>

      {/* ===== 4 CLEAN STAT CARDS (REFERENCE STYLE) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Orders */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{totalOrdersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {formatCurrency(totalRevenueCents)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Tickets Sold */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tickets Issued</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{totalTicketsSold}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{successRate}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/70 text-purple-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ===== FILTER BAR (REFERENCE STYLE) ===== */}
      <div className="rounded-xl bg-white p-5 border border-slate-200/90 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="h-4 w-4 text-amber-600" />
            <span>Filter Orders</span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {paginatedOrders.length} of {filteredOrders.length} orders (Page {currentPage} of {totalPages})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Order ID, customer name, email, or event..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== ORDERS DATA TABLE (HORIZONTAL SCROLLABLE & PAGINATED) ===== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Orders Ledger</h2>
          <span className="text-xs text-slate-400 font-medium">
            {filteredOrders.length} total records
          </span>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Event</th>
                <th className="px-5 py-3.5">Tickets</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading orders...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No orders found</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== "ALL"
                        ? "No orders match your filter criteria."
                        : "Orders placed by customers will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const ticketsCount = order._count?.tickets || order.tickets?.length || 1;

                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Order ID */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-900 text-xs">
                            {order.orderNumber}
                          </span>
                          <button
                            onClick={(e) => handleCopyId(order.orderNumber, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-700"
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
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900 truncate">
                          {order.user?.name || "Guest Customer"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {order.user?.email || "N/A"}
                        </p>
                      </td>

                      {/* Event */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 truncate max-w-44" title={order.event?.title}>
                          {order.event?.title || "Special Event"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {order.event?.venue?.name || "Venue"} ({order.event?.venue?.city || "City"})
                        </p>
                      </td>

                      {/* Tickets Count */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          <Ticket className="w-3 h-3 text-slate-400" />
                          {ticketsCount}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {formatCurrency(order.totalCents, order.currency)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
        {filteredOrders.length > pageSize && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
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

      {/* ===== ORDER DETAILS MODAL (PRESERVED LOGIC) ===== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Order Details
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {selectedOrder.orderNumber}
                    </span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-3">
              
              {/* Customer Box */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer Information
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Name</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.user?.name || "Guest Attendee"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Email</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.user?.email || "N/A"}</span>
                </div>
                {selectedOrder.user?.phone && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Phone</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.user.phone}</span>
                  </div>
                )}
              </div>

              {/* Event Box */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Event & Venue
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Event</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.event?.title || "Special Event"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Venue</span>
                  <span className="font-semibold text-slate-900">
                    {selectedOrder.event?.venue?.name || "Venue"}, {selectedOrder.event?.venue?.city || "City"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Date</span>
                  <span className="font-semibold text-slate-900">{formatDate(selectedOrder.event?.startsAt)}</span>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Summary
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Tickets Quantity</span>
                  <span className="font-bold text-slate-900">
                    {selectedOrder._count?.tickets || selectedOrder.tickets?.length || 1} Tickets
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Base Price</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(selectedOrder.ticketTotalCents || selectedOrder.totalCents, selectedOrder.currency)}
                  </span>
                </div>
                {selectedOrder.buyerFeeCents > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Processing Fee</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(selectedOrder.buyerFeeCents, selectedOrder.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Total Paid</span>
                  <span className="font-bold text-amber-950">
                    {formatCurrency(selectedOrder.totalCents, selectedOrder.currency)}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
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
