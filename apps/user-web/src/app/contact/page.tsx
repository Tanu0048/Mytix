"use client";

import React from "react";
import Link from "next/link";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Sparkles, 
  Ticket, 
  HelpCircle, 
  Building2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export default function ContactPage() {
  const contactCards = [
    {
      icon: Mail,
      iconColor: "text-amber-600 bg-amber-100",
      title: "Customer Support Email",
      subtitle: "For ticket inquiries, event entry, and refund requests",
      actionText: "support@mytix.com.au",
      actionHref: "mailto:support@mytix.com.au",
      badge: "Fastest response (<2h)"
    },
    {
      icon: Phone,
      iconColor: "text-emerald-600 bg-emerald-100",
      title: "24/7 Phone Hotline",
      subtitle: "Toll-free assistance across all Australian states",
      actionText: "1800 MYTIX (1800 698 490)",
      actionHref: "tel:1800698490",
      badge: "24/7 on event days"
    },
    {
      icon: Building2,
      iconColor: "text-indigo-600 bg-indigo-100",
      title: "Organisers & Partnerships",
      subtitle: "For promoters, festivals, and venue ticket management",
      actionText: "organisers@mytix.com.au",
      actionHref: "mailto:organisers@mytix.com.au",
      badge: "Partnerships"
    },
    {
      icon: Clock,
      iconColor: "text-blue-600 bg-blue-100",
      title: "Operating Hours",
      subtitle: "Dedicated local support team ready to assist",
      actionText: "Mon – Sun: 24/7 Event Coverage",
      actionHref: null,
      badge: "Always Open"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Banner */}
      <div className="relative bg-[#070b13] text-white pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Australian Customer Care
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Contact Mytix Support
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            We&apos;re here to assist you with tickets, venue entry, bookings, and organizer partnerships.
          </p>
        </div>
      </div>

      {/* Main Content (Clean spacing, zero overlap) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Contact Methods Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {contactCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${card.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {card.actionHref ? (
                    <a 
                      href={card.actionHref}
                      className="inline-flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-amber-600 hover:text-amber-700 transition"
                    >
                      {card.actionText} <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-sm sm:text-base font-extrabold text-slate-800">
                      {card.actionText}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Office Locations */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Australian Office Locations
              </h2>
              <p className="text-xs text-slate-500">Corporate & operations headquarters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600">Melbourne HQ</p>
              <p className="text-sm font-bold text-slate-900">Level 14, 120 Collins Street</p>
              <p className="text-xs text-slate-500">Melbourne, Victoria 3000, Australia</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600">Sydney Hub</p>
              <p className="text-sm font-bold text-slate-900">Level 22, 200 George Street</p>
              <p className="text-xs text-slate-500">Sydney, New South Wales 2000, Australia</p>
            </div>
          </div>
        </div>

        {/* Quick Ticket Access Banner */}
        <div className="rounded-2xl bg-linear-to-r from-slate-900 to-slate-950 p-6 sm:p-8 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Looking for your event tickets?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All purchased tickets and instant QR codes are ready in your profile.
              </p>
            </div>
          </div>

          <Link
            href="/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shrink-0"
          >
            Access My Tickets
          </Link>
        </div>

      </div>
    </div>
  );
}
