"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { API_BASE } from '@/config/api';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Ticket, 
  LogOut, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchUser, logout, loading: authLoading, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      setName(user.name || '');
    }
  }, [user, authLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }

    try {
      setSaving(true);
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${API_BASE}/me`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ 
          name: trimmedName,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated.data || updated.user || updated);
        toast.success('Profile updated successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to update profile');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${API_BASE}/me`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        await logout();
        setIsDeleteModalOpen(false);
        toast.success('Your account has been deleted.');
        router.push('/');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete account.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Profile Hero Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-linear-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-md shadow-amber-400/20 shrink-0 border-4 border-white">
            {initials}
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight truncate">
                {user.name}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-center sm:self-auto">
                Verified Member
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium truncate">{user.email}</p>
          </div>
        </div>

        <div className="space-y-8">

          {/* Section 1: Personal Details */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-xs text-gray-500">Update your public name and contact phone number.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm font-medium text-gray-900 bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Email is locked because all purchased event tickets and invoices are sent to this address.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-400/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: My Tickets Quick Card */}
          <div className="bg-linear-to-br from-amber-50 via-yellow-50/60 to-white rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shrink-0 shadow-sm">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">My Tickets & Entry Passes</h2>
                <p className="text-sm text-gray-600 max-w-md">
                  View your purchased tickets, event dates, and live QR codes to scan at the gate.
                </p>
              </div>
            </div>
            <Link
              href="/tickets"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer"
            >
              <span>View Tickets</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Section 2.5: Order History & Invoices Quick Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-amber-200 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Order History & Invoices</h2>
                <p className="text-sm text-gray-500 max-w-md">
                  View past booking receipts, order numbers, and official Australian GST tax invoice breakdowns.
                </p>
              </div>
            </div>
            <Link
              href="/orders"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <span>View Orders</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Section 3: Account & Security */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Account & Security</h2>
                <p className="text-xs text-gray-500">Manage session security and permanent account deletion.</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Log Out */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Sign Out</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Safely log out of your account on this device.</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>

              {/* Delete Account */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-red-600">Delete Account</h3>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                    Permanently wipe and anonymize your personal information. This action is irreversible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete your account?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to delete your account? This action is permanent and cannot be undone. All your personal data will be anonymized, and you will immediately lose access to your account and tickets.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
