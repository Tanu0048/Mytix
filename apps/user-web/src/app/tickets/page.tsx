"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Calendar, MapPin, Ticket as TicketIcon, Loader2, User } from 'lucide-react';
import QRCode from 'react-qr-code';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      fetchTickets();
    }
  }, [user, authLoading, router]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/me/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
            <TicketIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Tickets</h1>
            <p className="text-gray-500 mt-1 font-medium">Manage and view your purchased tickets for upcoming events.</p>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <TicketIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-base">Looks like you haven't booked any events yet. Explore what's happening and grab your tickets!</p>
            <button 
              onClick={() => router.push('/events')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-md hover:shadow-lg"
            >
              Explore Events
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {tickets.map((ticket) => {
              const eventDate = new Date(ticket.order.event.startsAt);
              const formattedDate = eventDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              const formattedTime = eventDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

              return (
                <div key={ticket.id} className="relative bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden border border-gray-100 flex flex-col md:flex-row group transition-all hover:shadow-[0_15px_40px_rgb(0,0,0,0.1)] hover:-translate-y-1">
                  
                  {/* Left Side: Event Details */}
                  <div className="flex-1 p-6 md:p-8 relative">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-bl-full -z-10 opacity-70"></div>
                    
                    <div className="inline-block px-4 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-widest mb-4 shadow-sm border border-green-200">
                      {ticket.status}
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 mb-5 pr-4 leading-tight">
                      {ticket.order.event.title}
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center text-gray-600">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 border border-gray-100 shrink-0">
                          <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{formattedDate}</div>
                          <div className="text-sm font-medium text-gray-500">{formattedTime}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 border border-gray-100 shrink-0">
                          <MapPin className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm truncate max-w-48 sm:max-w-xs">{ticket.order.event.venue.name}</div>
                          <div className="text-sm font-medium text-gray-500">{ticket.order.event.venue.city}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-gray-600 pt-3 border-t border-gray-100 mt-2">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 border border-gray-100 shrink-0">
                          <User className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{ticket.attendeeName}</div>
                          <div className="text-xs font-medium text-gray-400 mt-0.5">Ticket ID: {ticket.id.split('-')[0].toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Perforation Line (Hidden on mobile, shows on desktop) */}
                  <div className="hidden md:flex flex-col items-center justify-center relative w-8 bg-gray-50/50 border-l border-r border-dashed border-gray-200">
                    <div className="absolute -top-4 w-8 h-8 bg-gray-50 rounded-full shadow-inner"></div>
                    <div className="absolute -bottom-4 w-8 h-8 bg-gray-50 rounded-full shadow-inner"></div>
                  </div>
                  
                  {/* Perforation Line (Shows on mobile, hidden on desktop) */}
                  <div className="md:hidden flex items-center justify-center relative h-8 bg-gray-50/50 border-t border-b border-dashed border-gray-200">
                    <div className="absolute -left-4 w-8 h-8 bg-gray-50 rounded-full shadow-inner"></div>
                    <div className="absolute -right-4 w-8 h-8 bg-gray-50 rounded-full shadow-inner"></div>
                  </div>

                  {/* Right Side: QR Code */}
                  <div className="p-6 md:p-8 bg-gray-50/50 flex flex-col items-center justify-center md:w-80 shrink-0">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-5 w-full flex justify-center">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-full md:h-auto max-w-48">
                        <QRCode 
                          value={ticket.qrTokenHash || ticket.id} 
                          size={256}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 256 256`}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center font-semibold bg-white py-2 px-4 rounded-full border border-gray-200 shadow-sm">
                      Scan this code at the gate
                    </p>
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
