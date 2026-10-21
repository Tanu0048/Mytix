"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  HelpCircle, 
  Sparkles,
  Ticket,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bookingId: "",
    topic: "Ticketing & Entry",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success("Message received! Our Australian support team will reply within 2 hours.");
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Hero Header */}
      <div className="relative bg-[#070b13] text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Australian Customer Care
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            How can we help you today?
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Have questions about your concert tickets, venue gate entry, or putting on your own show? We&apos;re here for you 24/7.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Quick Contact Cards */}
          <div className="space-y-4">
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-amber-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Email Us</h3>
              <p className="text-xs text-slate-500 mb-3">Average response time: under 2 hours</p>
              <a 
                href="mailto:support@mytix.com.au" 
                className="text-sm font-bold text-amber-600 hover:text-amber-700 transition"
              >
                support@mytix.com.au
              </a>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-amber-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Call Our Hotline</h3>
              <p className="text-xs text-slate-500 mb-3">Toll-free across Australia</p>
              <p className="text-sm font-bold text-slate-800">
                1800 MYTIX (1800 698 490)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Available 24/7 on event days</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-amber-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Australian HQ</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-1">
                Level 14, 120 Collins Street
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Melbourne, VIC 3000, Australia
              </p>
            </div>

            {/* Quick Ticket Help Link */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm">Need your tickets re-sent?</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Access your instant QR e-tickets anytime right from your profile dashboard.
              </p>
              <Link 
                href="/profile" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                Go to My Tickets <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-md">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Thank You! Message Sent
                  </h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                    We have received your inquiry. A confirmation receipt has been sent to <span className="font-bold text-slate-900">{formData.email}</span>. A member of our support team will get in touch shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        bookingId: "",
                        topic: "Ticketing & Entry",
                        message: ""
                      });
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer mt-4"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Send Us a Message
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Fill out the form below and our team will get back to you promptly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="sarah@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Topic / Category
                      </label>
                      <select
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition bg-white"
                      >
                        <option value="Ticketing & Entry">Ticketing & Entry QR</option>
                        <option value="Refunds & Cancellations">Refunds & Cancellations</option>
                        <option value="Event Organiser Inquiries">Event Organiser & Sales</option>
                        <option value="Payment & Billing">Payment & Invoices</option>
                        <option value="Venue & Turnstiles">Venue Scanning & Turnstiles</option>
                        <option value="Other">Other Question</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Order / Booking ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bookingId}
                        onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                        placeholder="e.g. ORD-98124"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Your Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please tell us how we can assist you with your tickets or booking..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-400/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? "Sending Message..." : "Submit Inquiry"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
