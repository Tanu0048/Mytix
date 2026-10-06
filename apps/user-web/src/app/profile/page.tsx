"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Ticket, User, Settings, LogOut, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets'>('tickets');
  const [orders, setOrders] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoadingOrders(true);
        const res = await fetch('http://localhost:5000/api/v1/me/orders', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoadingOrders(false);
      }
    }

    if (user && activeTab === 'tickets') {
      fetchOrders();
    }
  }, [user, activeTab]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{user.name}</h2>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => setActiveTab('tickets')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tickets' ? 'bg-yellow-50 text-yellow-500' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Ticket className="w-4 h-4" />
                  My Tickets
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-yellow-50 text-yellow-500' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <User className="w-4 h-4" />
                  Profile Details
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-gray-100 my-2"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'tickets' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Tickets & Orders</h2>
                
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets yet</h3>
                    <p className="text-gray-500 mb-6">You haven&apos;t booked any concerts or events yet.</p>
                    <Link href="/" className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg transition-colors inline-block">
                      Browse Concerts
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <div className="w-full md:w-48 h-32 relative rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <Ticket className="w-8 h-8" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-xl text-gray-900">Booking #{order.id?.slice(-6).toUpperCase() || 'ABCDEF'}</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              {order.status || 'CONFIRMED'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Total Amount: <span className="font-bold text-gray-900">₹{(order.totalAmountCents / 100).toFixed(2)}</span>
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Booked on {new Date(order.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Details</h2>
                <form className="max-w-xl space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" defaultValue={user.name} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" defaultValue={user.email} disabled className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 outline-none" />
                  </div>
                  <button type="button" className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg transition-colors">
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
