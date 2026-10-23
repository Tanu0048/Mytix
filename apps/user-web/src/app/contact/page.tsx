"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Sparkles, 
  Ticket, 
  Building2, 
  ArrowRight,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { API_BASE } from "@/config/api";

interface ContactCard {
  title: string;
  subtitle: string;
  actionText: string;
  actionHref?: string | null;
  badge: string;
  iconType?: string;
}

interface ContactOffice {
  label: string;
  address: string;
  city: string;
}

interface ContactUsData {
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  contactCards: ContactCard[];
  offices: ContactOffice[];
}

const DEFAULT_CONTACT: ContactUsData = {
  heroTagline: "Australian Customer Care",
  heroTitle: "Contact Mytix Support",
  heroDescription: "We're here to assist you with tickets, venue entry, bookings, and organizer partnerships.",
  contactCards: [
    {
      title: "Customer Support Email",
      subtitle: "For ticket inquiries, event entry, and refund requests",
      actionText: "support@mytix.com.au",
      actionHref: "mailto:support@mytix.com.au",
      badge: "Fastest response (<2h)",
      iconType: "mail"
    },
    {
      title: "24/7 Phone Hotline",
      subtitle: "Toll-free assistance across all Australian states",
      actionText: "1800 MYTIX (1800 698 490)",
      actionHref: "tel:1800698490",
      badge: "24/7 on event days",
      iconType: "phone"
    },
    {
      title: "Organisers & Partnerships",
      subtitle: "For promoters, festivals, and venue ticket management",
      actionText: "organisers@mytix.com.au",
      actionHref: "mailto:organisers@mytix.com.au",
      badge: "Partnerships",
      iconType: "building"
    },
    {
      title: "Operating Hours",
      subtitle: "Dedicated local support team ready to assist",
      actionText: "Mon – Sun: 24/7 Event Coverage",
      actionHref: null,
      badge: "Always Open",
      iconType: "clock"
    }
  ],
  offices: [
    {
      label: "Melbourne HQ",
      address: "Level 14, 120 Collins Street",
      city: "Melbourne, Victoria 3000, Australia"
    },
    {
      label: "Sydney Hub",
      address: "Level 22, 200 George Street",
      city: "Sydney, New South Wales 2000, Australia"
    }
  ]
};

function getCardIcon(iconType?: string, index: number = 0) {
  const type = (iconType || "").toLowerCase();
  if (type === "mail" || type === "email") {
    return { icon: Mail, color: "text-amber-600 bg-amber-100" };
  }
  if (type === "phone" || type === "call") {
    return { icon: Phone, color: "text-emerald-600 bg-emerald-100" };
  }
  if (type === "building" || type === "office") {
    return { icon: Building2, color: "text-indigo-600 bg-indigo-100" };
  }
  if (type === "clock" || type === "time") {
    return { icon: Clock, color: "text-blue-600 bg-blue-100" };
  }
  const defaults = [
    { icon: Mail, color: "text-amber-600 bg-amber-100" },
    { icon: Phone, color: "text-emerald-600 bg-emerald-100" },
    { icon: Building2, color: "text-indigo-600 bg-indigo-100" },
    { icon: Clock, color: "text-blue-600 bg-blue-100" }
  ];
  return defaults[index % defaults.length];
}

export default function ContactPage() {
  const [data, setData] = useState<ContactUsData>(DEFAULT_CONTACT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContact() {
      try {
        const res = await fetch(`${API_BASE}/contact-us`, {
          cache: "no-store"
        });
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === "object") {
            setData((prev) => ({
              ...prev,
              ...json,
              contactCards: Array.isArray(json.contactCards) && json.contactCards.length > 0 ? json.contactCards : prev.contactCards,
              offices: Array.isArray(json.offices) && json.offices.length > 0 ? json.offices : prev.offices
            }));
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic contact data, displaying fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadContact();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Banner */}
      <div className="relative bg-[#070b13] text-white pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> {data.heroTagline || "Australian Customer Care"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {data.heroTitle || "Contact Mytix Support"}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {data.heroDescription}
          </p>
        </div>
      </div>

      {/* Main Content (Clean spacing, zero overlap) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Contact Methods Grid */}
        {data.contactCards && data.contactCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {data.contactCards.map((card, idx) => {
              const { icon: Icon, color: iconColor } = getCardIcon(card.iconType, idx);
              return (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {card.badge && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                          {card.badge}
                        </span>
                      )}
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
        )}

        {/* Office Locations */}
        {data.offices && data.offices.length > 0 && (
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
              {data.offices.map((office, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-600">{office.label}</p>
                  <p className="text-sm font-bold text-slate-900">{office.address}</p>
                  <p className="text-xs text-slate-500">{office.city}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
