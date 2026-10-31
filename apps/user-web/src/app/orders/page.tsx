"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Receipt, 
  Ticket, 
  Calendar, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { API_BASE } from '@/config/api';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/me/orders`);

      if (res.ok) {
        const data = await res.json();
        const list = data.data || data.orders || (Array.isArray(data) ? data : []);
        setOrders(list);
      } else {
        // Direct Supabase Fallback
        try {
          const SUPABASE_URL = 'https://kfcocpzuzxpinqgnzhsq.supabase.co';
          const ANON_KEY =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY29jcHp1enhwaW5xZ256aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODk2NjgsImV4cCI6MjEwNjc2NTY2OH0.tDVNBk_Pi88UHQoWFQZMgjADTZf6PhGYFWAuynzJfMk';

          if (user?.id) {
            const sbRes = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?select=*,events(id,title,starts_at,venues(name,city)),order_items(*,ticket_types(name))&user_id=eq.${user.id}&order=created_at.desc`,
              {
                headers: {
                  apikey: ANON_KEY,
                  Authorization: `Bearer ${ANON_KEY}`,
                },
              }
            );
            if (sbRes.ok) {
              const sbData = await sbRes.json();
              if (Array.isArray(sbData)) {
                setOrders(sbData);
              }
            }
          }
        } catch (sbErr) {
          console.warn('Supabase fallback error:', sbErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading your orders & tax invoices...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 shadow-xs border border-amber-300/80 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order History & Invoices</h1>
            <p className="text-gray-500 mt-0.5 text-sm font-medium">
              View past bookings, payment receipts, and official Australian GST tax records.
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <ShoppingBag className="w-9 h-9 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm">
              You haven&apos;t placed any event ticket bookings yet. Discover upcoming concerts and festivals in Australia!
            </p>
            <button
              onClick={() => router.push('/events')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold py-3 px-8 rounded-full shadow-lg shadow-amber-400/20 transition-all cursor-pointer text-sm"
            >
              Explore Live Events
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              const event = order.event || order.events || {};
              const venue = event.venue || event.venues || {};
              const rawDate = event.startsAt || event.starts_at;
              const eventDate = rawDate ? new Date(rawDate) : null;
              const orderCreatedAt = order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : null;

              const formattedOrderDate = orderCreatedAt
                ? orderCreatedAt.toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'Date TBA';

              const formattedEventDate = eventDate
                ? eventDate.toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Date TBA';

              const totalAud = ((order.totalCents || 0) / 100).toFixed(2);
              const ticketTotalAud = ((order.ticketTotalCents || order.totalCents || 0) / 100).toFixed(2);
              const buyerFeeAud = ((order.buyerFeeCents || 0) / 100).toFixed(2);
              const orderNum = order.orderNumber || order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : 'ORD-MYTIX');
              const status = order.status || 'PAID';
              const itemsList = order.items || order.order_items || [];

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all hover:border-amber-200"
                >
                  {/* Top Row: Order # & Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-extrabold text-gray-900 tracking-tight">#{orderNum}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                            status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-1">Booked on {formattedOrderDate}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xl font-black text-gray-900">${totalAud} AUD</div>
                      <span className="text-[11px] font-bold text-gray-400">All prices GST Inclusive</span>
                    </div>
                  </div>

                  {/* Middle Row: Event Preview */}
                  <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-base">{event.title || 'Live Event'}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {formattedEventDate} • {venue.name || 'Venue TBA'} ({venue.city || 'Australia'})
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/tickets"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      View QR Passes
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Expandable Tax Invoice Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 bg-gray-50/60 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
                          Official Australian Tax Invoice / Receipt
                        </span>
                        <span className="text-[11px] text-gray-500 font-semibold">Ref: #{orderNum}</span>
                      </div>

                      {/* Items */}
                      {itemsList.length > 0 && (
                        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                          {itemsList.map((item: any, idx: number) => {
                            const tName = item.ticketType?.name || item.ticket_types?.name || 'General Admission';
                            const qty = item.quantity || 1;
                            const unitPrice = ((item.unitPriceCents || 0) / 100).toFixed(2);
                            const seats = item.selectedSeats || item.selected_seats;
                            const seatStr = Array.isArray(seats)
                              ? seats.map((s: string) => (s.includes(':') ? s.split(':')[1] : s)).join(', ')
                              : null;

                            return (
                              <div key={idx} className="flex justify-between items-start text-xs">
                                <div>
                                  <span className="font-bold text-gray-900">{tName}</span> × {qty}
                                  {seatStr && <div className="text-[11px] text-gray-500 mt-0.5">Seats: {seatStr}</div>}
                                </div>
                                <span className="font-bold text-gray-900">
                                  ${(parseFloat(unitPrice) * qty).toFixed(2)} AUD
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Subtotal & Fee */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span>Ticket Face Value Subtotal</span>
                          <span className="font-semibold text-gray-900">${ticketTotalAud} AUD</span>
                        </div>
                        {parseFloat(buyerFeeAud) > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Processing & Booking Surcharge (incl. 10% GST)</span>
                            <span className="font-semibold text-gray-900">${buyerFeeAud} AUD</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                          <span>Total Paid</span>
                          <span>${totalAud} AUD</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Mytix Australia • Official Merchant of Record • GST Tax Invoice Issued</span>
                      </div>
                    </div>
                  )}

                  {/* Toggle Button */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Tax Invoice
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          View Tax Invoice Summary
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {itemsList.length} ticket{itemsList.length > 1 ? 's' : ''} allocation
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
