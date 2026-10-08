"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Ticket, User, Settings, LogOut, Calendar, MapPin, ChevronRight, Clock, Package, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

function getStatusStyle(status: string) {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED': return 'bg-green-100 text-green-700';
    case 'PENDING': return 'bg-yellow-100 text-yellow-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700';
    case 'REFUNDED': return 'bg-gray-100 text-gray-600';
    default: return 'bg-blue-100 text-blue-700';
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile' | 'settings'>('bookings');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
    if (user) {
      setProfileForm({ name: user.name || '', phone: (user as any).phone || '' });
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && activeTab === 'bookings') {
      fetchOrders();
    }
  }, [user, activeTab]);

  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/me/orders`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone }),
      });
      if (res.ok) {
        setProfileMsg('Profile updated successfully!');
      } else {
        setProfileMsg('Failed to update profile. Please try again.');
      }
    } catch {
      setProfileMsg('Something went wrong.');
    } finally {
      setSavingProfile(false);
    }
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const initials = user.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Page Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Account</h1>

        <div className="flex flex-col md:flex-row gap-7">

          {/* ===== Sidebar ===== */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              {/* Avatar + Name */}
              <div className="p-6 bg-gradient from-yellow-50 to-yellow-100 border-b border-yellow-100">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-white font-extrabold text-2xl mb-3 shadow-md">
                  {initials}
                </div>
                <h2 className="font-bold text-gray-900 text-lg leading-tight">{user.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                <span className="mt-2 inline-block text-xs font-semibold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full capitalize">
                  {(user as any).role?.toLowerCase() || 'user'}
                </span>
              </div>

              {/* Nav Links */}
              <nav className="p-2">
                {[
                  { key: 'bookings', icon: <Package className="w-4 h-4" />, label: 'My Bookings' },
                  { key: 'profile', icon: <User className="w-4 h-4" />, label: 'Profile Details' },
                  { key: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                      activeTab === item.key
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {activeTab === item.key && <ChevronRight className="w-4 h-4 ml-auto text-yellow-400" />}
                  </button>
                ))}
                <div className="h-px bg-gray-100 my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* ===== Main Content ===== */}
          <main className="flex-1 min-w-0">

            {/* MY BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
                  <span className="text-sm text-gray-500">{orders.length} booking{orders.length !== 1 ? 's' : ''}</span>
                </div>

                {loadingOrders ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 flex gap-5 animate-pulse border border-gray-100">
                        <div className="w-28 h-28 bg-gray-200 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-3 py-2">
                          <div className="h-5 bg-gray-200 rounded w-2/3" />
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-gray-100">
                      <Ticket className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings yet</h3>
                    <p className="text-gray-500 text-sm mb-7">You haven&apos;t booked any events yet. Start exploring!</p>
                    <Link
                      href="/"
                      className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-xl transition-colors inline-block text-sm"
                    >
                      Browse Events
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => {
                      const event = order.event;
                      const totalItems = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;
                      const totalAmount = order.totalAmountCents ? (order.totalAmountCents / 100).toLocaleString('en-IN') : '0';
                      const isUpcoming = event?.startsAt ? new Date(event.startsAt) > new Date() : false;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-md transition-all overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row gap-0">
                            {/* Event Poster */}
                            <div className="relative w-full sm:w-36 h-36 sm:h-auto shrink-0 bg-gray-100">
                              {event?.posterPath ? (
                                <Image
                                  src={getFullImageUrl(event.posterPath)}
                                  alt={event.title || 'Event'}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Ticket className="w-10 h-10 text-gray-300" />
                                </div>
                              )}
                              {isUpcoming && (
                                <div className="absolute top-2 left-2">
                                  <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                                    Upcoming
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Order Details */}
                            <div className="flex-1 p-5">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="text-xs text-gray-400 font-mono mb-1">
                                    Order #{order.orderNumber || order.id?.slice(-8).toUpperCase()}
                                  </p>
                                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                                    {event?.title || 'Event Booking'}
                                  </h3>
                                </div>
                                <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                                  {order.status || 'CONFIRMED'}
                                </span>
                              </div>

                              {/* Event Meta */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-4">
                                {event?.venue && (
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                    {event.venue.name}, {event.venue.city}
                                  </span>
                                )}
                                {event?.startsAt && (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                    {new Date(event.startsAt).toLocaleDateString('en-IN', {
                                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                  </span>
                                )}
                                {event?.startsAt && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                    {new Date(event.startsAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit', minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>

                              {/* Ticket types */}
                              {order.items?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {order.items.map((item: any, i: number) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                                      {item.quantity}x {item.ticketType?.name || 'Ticket'}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div>
                                  <p className="text-xs text-gray-400">Total Paid</p>
                                  <p className="text-base font-extrabold text-gray-900">₹{totalAmount}</p>
                                </div>
                                <div className="flex gap-2">
                                  {event?.slug && (
                                    <Link
                                      href={`/events/${event.slug}`}
                                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors"
                                    >
                                      View Event
                                    </Link>
                                  )}
                                  <Link
                                    href={`/tickets?order=${order.orderNumber || order.id}`}
                                    className="text-xs font-semibold bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg transition-colors"
                                  >
                                    View Tickets
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE DETAILS TAB */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-7">Profile Details</h2>
                <form onSubmit={handleSaveProfile} className="max-w-md space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full p-3.5 border border-gray-100 bg-gray-50 rounded-xl text-gray-400 outline-none cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all text-gray-900"
                    />
                  </div>
                  {profileMsg && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${profileMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {profileMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-bold py-3 px-8 rounded-xl transition-colors text-sm"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-7">Settings</h2>
                <div className="max-w-md space-y-4">
                  <div className="border border-gray-100 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-800 mb-1">Notifications</h3>
                    <p className="text-sm text-gray-500 mb-4">Manage your email notification preferences.</p>
                    <div className="space-y-3">
                      {['Booking confirmations', 'Event reminders', 'New events from followed artists'].map((item) => (
                        <label key={item} className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm text-gray-700">{item}</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 accent-yellow-400" />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border border-red-100 rounded-xl p-5">
                    <h3 className="font-semibold text-red-700 mb-1">Danger Zone</h3>
                    <p className="text-sm text-gray-500 mb-4">Once deleted, your account and personal data will be permanently removed.</p>
                    <button className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-5 py-2.5 rounded-lg transition-colors">
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
