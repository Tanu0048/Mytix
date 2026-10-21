"use client";

import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Ticket, 
  ShieldCheck, 
  Zap, 
  Users, 
  MapPin, 
  ArrowRight, 
  HeartHandshake, 
  Award,
  CheckCircle2,
  TrendingUp,
  Music2
} from "lucide-react";

export default function AboutPage() {
  const stats = [
    { label: "Tickets Delivered", value: "500K+", sub: "100% digital & paperless" },
    { label: "Partner Venues", value: "180+", sub: "Across all Australian states" },
    { label: "Gate Entry Speed", value: "<1 sec", sub: "Instant cryptographic QR scan" },
    { label: "Fan Satisfaction", value: "99.4%", sub: "Verified attendee rating" }
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: "Zero Hidden Fees",
      desc: "We believe in honest ticketing. The price you see on an event is what you pay at checkout. No surprise service charges, processing markups, or print-at-home extortion."
    },
    {
      icon: Zap,
      title: "Instant Digital Gate Entry",
      desc: "Our proprietary QR turnstile technology validates tickets in less than one second, eliminating long queues and counterfeit passes so you spend more time enjoying the show."
    },
    {
      icon: Users,
      title: "Creator-First Ecosystem",
      desc: "We empower independent artists, comedy clubs, and stadium promoters with high-speed reserved seating maps, transparent analytics, and reliable revenue settlements."
    },
    {
      icon: HeartHandshake,
      title: "Australian Fan Protection",
      desc: "Fully compliant with Australian Consumer Law (ACL) and state anti-scalping legislation. If an event is cancelled or postponed, refunds are handled fairly and promptly."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <div className="relative bg-[#070b13] text-white pt-16 pb-16 px-4 sm:px-6 lg:px-8 border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-96 h-96 bg-amber-500/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Our Story & Mission
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Built for live moments. <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-amber-200">
              Honest ticketing for Australia.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Mytix was founded with a singular purpose: to replace frustrating ticket queues, hidden fees, and ticket scalping with a seamless, mobile-first live entertainment experience.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* Stats Counter Ribbon */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-amber-600 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Narrative Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-extrabold tracking-widest uppercase text-amber-600">
              Why Mytix Exists
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              A modern platform made for fans, artists, and venues.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              For decades, buying concert tickets has felt stressful. Fans endured broken waiting rooms, predatory price hikes, and secondary scalpers who marked up tickets by 300%.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Mytix changes that. From stadium arena tours in Melbourne and Sydney to intimate comedy clubs in Brisbane and Perth, we bring transparency, reliability, and security to every booking.
            </p>
          </div>

          <div className="bg-linear-to-br from-slate-900 to-slate-950 rounded-3xl p-8 text-white border border-slate-800 shadow-xl space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Music2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white">
              Every city. Every beat. Every Aussie stage.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              We partner directly with leading promoters, local venues, and Australian festivals to guarantee that every ticket purchased on Mytix is genuine, authorized, and turnstile-ready.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              100% Genuine Admission Guarantee
            </div>
          </div>
        </div>

        {/* Core Pillars Grid */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              What sets Mytix apart
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Our core values guide every line of code and customer interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-400 transition-all space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {val.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl bg-linear-to-r from-amber-500 to-amber-400 p-8 sm:p-12 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready to discover upcoming shows?
            </h3>
            <p className="text-sm font-semibold text-slate-900 max-w-md">
              Explore live gigs, comedy specials, and festival passes in your city today.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/events"
              className="px-6 py-3 rounded-full bg-slate-950 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition shadow-md"
            >
              Browse Events
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full bg-white/40 hover:bg-white/60 text-slate-950 font-bold text-xs sm:text-sm transition"
            >
              Contact Us
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
