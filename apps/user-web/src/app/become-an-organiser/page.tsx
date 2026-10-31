"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  FileCheck2, 
  ShieldCheck, 
  CreditCard, 
  Scale, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Phone, 
  Clock, 
  MapPin, 
  QrCode, 
  Users, 
  Zap, 
  Check
} from "lucide-react";
import { API_BASE } from "@/config/api";

interface RequirementItem {
  title: string;
  description: string;
  badge: string;
}

interface BenefitItem {
  title: string;
  desc: string;
}

interface StepItem {
  step: string;
  title: string;
  desc: string;
}

interface ContactDetails {
  heading: string;
  subheading: string;
  email: string;
  phone: string;
  hours: string;
  address: string;
}

interface OrganiserRequirementsData {
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  requirements: RequirementItem[];
  benefits: BenefitItem[];
  onboardingSteps: StepItem[];
  contactDetails: ContactDetails;
}

const DEFAULT_DATA: OrganiserRequirementsData = {
  heroTagline: "Creator & Promoter Partnership",
  heroTitle: "Become a Verified Mytix Organiser",
  heroDescription: "Everything you need to know to partner with Mytix, publish events, sell tickets across Australia, and manage venue gate entry with zero hassle.",
  requirements: [
    {
      title: "Australian Business Registration (ABN / ACN)",
      description: "Organisers must hold an active Australian Business Number (ABN) or registered business entity in Australia.",
      badge: "Mandatory"
    },
    {
      title: "Verified Commercial Bank Account",
      description: "A nominated Australian bank account (BSB & Account Number) matching your legal entity for direct scheduled revenue payouts.",
      badge: "Mandatory"
    },
    {
      title: "Identity & Key Contact Verification",
      description: "Primary account holder must provide a valid Australian Driver's Licence or Passport to complete KYC security standards.",
      badge: "KYC Security"
    },
    {
      title: "Venue Hire Agreement or Ownership Proof",
      description: "An authorized contract, booking confirmation, or council permit granting permission to host the event at the nominated venue.",
      badge: "Venue Compliance"
    },
    {
      title: "Public Liability Insurance & Safety Plan",
      description: "Current Public Liability Insurance certificate (minimum $10M–$20M depending on venue capacity) and emergency crowd safety plan.",
      badge: "Event Safety"
    },
    {
      title: "Fair Ticketing & ACL Compliance",
      description: "Commitment to Australian Consumer Law (ACL), state anti-scalping regulations, and transparent all-inclusive ticket pricing.",
      badge: "Consumer Law"
    }
  ],
  benefits: [
    {
      title: "Fast Turnstile QR Scanner",
      desc: "Turn your gate security's smartphones into 0.2-second high-speed turnstiles with real-time sync and duplicate-ticket fraud prevention."
    },
    {
      title: "Fast Transparent Settlements",
      desc: "Receive clear, reliable automated payouts and detailed financial reporting with zero surprise processing markups."
    },
    {
      title: "Gate Staff Role Isolation",
      desc: "Create restricted credentials for gate staff with individual staff IDs. Staff only see their scanner, with no access to financials."
    },
    {
      title: "Dedicated Promoter Support",
      desc: "Direct access to our Australian event operations team before, during, and after show day."
    }
  ],
  onboardingSteps: [
    {
      step: "01",
      title: "Submit Contact & Business Details",
      desc: "Reach out via our partnership channels with your ABN, event concept, and expected venue."
    },
    {
      step: "02",
      title: "Verification & Fast Approval",
      desc: "Our platform team verifies compliance, issues your Organiser Portal credentials, and configures your account."
    },
    {
      step: "03",
      title: "Create Staff Accounts & Launch",
      desc: "Publish your event, manage ticket tiers, generate gate staff IDs, and start selling tickets across Australia."
    }
  ],
  contactDetails: {
    heading: "Get in Touch with our Partnerships Team",
    subheading: "Ready to put on a show or have questions about requirements? Contact our Australian team directly.",
    email: "organisers@mytix.com.au",
    phone: "1800 698 490 (Toll-Free AU)",
    hours: "Monday – Sunday: 24/7 Event Day Support",
    address: "Level 14, 120 Collins Street, Melbourne VIC 3000"
  }
};

export default function BecomeOrganiserPage() {
  const [cmsData, setCmsData] = useState<OrganiserRequirementsData>(DEFAULT_DATA);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${API_BASE}/catalog/organiser-requirements`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.requirements) {
            setCmsData(json);
          }
        }
      } catch (e) {
        // Fallback to default
      }
    }
    loadData();
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(cmsData.contactDetails.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white select-none">
      
      {/* ================= HERO HEADER ================= */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-white/5">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{cmsData.heroTagline}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            {cmsData.heroTitle}
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            {cmsData.heroDescription}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#requirements"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-[0_8px_20px_rgba(245,190,40,0.25)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              View Requirements Checklist
            </a>
            <a
              href="#contact"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition cursor-pointer"
            >
              Contact Details
            </a>
          </div>
        </div>
      </section>

      {/* ================= SECTION 1: REQUIREMENTS CHECKLIST ================= */}
      <section id="requirements" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-block text-xs font-black text-amber-400 uppercase tracking-widest">
            Eligibility & Verification
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Requirements to Host Events
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            To ensure trust, event safety, and prompt fan ticket delivery, organisers must meet the following criteria before publishing shows on Mytix.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cmsData.requirements.map((req, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#0f1420] border border-slate-800/80 hover:border-amber-400/30 transition-all space-y-4 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 font-black text-xs flex items-center justify-center">
                  0{idx + 1}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                  {req.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                  {req.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {req.description}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified in Organiser Review</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 2: ORGANISER ADVANTAGES ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0f19] border-y border-white/5">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
              Built For Australian Creators
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Why Sell Tickets on Mytix?
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              We empower Australian promoters and venues with next-generation ticketing technology and turnstile entry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cmsData.benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#111726] border border-slate-800/80 space-y-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-black">
                  {idx === 0 && <QrCode className="w-5 h-5" />}
                  {idx === 1 && <CreditCard className="w-5 h-5" />}
                  {idx === 2 && <Users className="w-5 h-5" />}
                  {idx === 3 && <Zap className="w-5 h-5" />}
                </div>
                <h3 className="text-sm font-black text-white">{benefit.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: ONBOARDING STEPS ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
            Simple 3-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            How to Get Started
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {cmsData.onboardingSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#0f1420] border border-slate-800 space-y-4 relative"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  {step.step}
                </span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Phase {idx + 1}
                </span>
              </div>
              <h3 className="text-base font-black text-white">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 4: DIRECT CONTACT DETAILS ================= */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-[#0a0f19] to-[#06080d] border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          
          <div className="p-8 sm:p-12 rounded-4xl bg-linear-to-br from-[#121929] via-[#0f1422] to-[#0a0f19] border border-amber-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden space-y-8">
            
            <div className="space-y-2 text-center sm:text-left">
              <span className="inline-block text-[11px] font-black uppercase tracking-widest text-amber-400">
                Direct Partnership Channels
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {cmsData.contactDetails.heading}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl">
                {cmsData.contactDetails.subheading}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Email */}
              <div className="p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span>Partnership Email</span>
                  </div>
                  <button
                    onClick={handleCopyEmail}
                    className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <a
                  href={`mailto:${cmsData.contactDetails.email}`}
                  className="text-base font-black text-white hover:text-amber-300 transition-colors block truncate"
                >
                  {cmsData.contactDetails.email}
                </a>
                <p className="text-[11px] text-slate-500">Fast response within 2 hours</p>
              </div>

              {/* Card 2: Phone */}
              <div className="p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Promoter Hotline</span>
                </div>
                <a
                  href={`tel:${cmsData.contactDetails.phone.replace(/[^0-9]/g, "")}`}
                  className="text-base font-black text-white hover:text-emerald-300 transition-colors block"
                >
                  {cmsData.contactDetails.phone}
                </a>
                <p className="text-[11px] text-slate-500">Toll-free across all Australian states</p>
              </div>

              {/* Card 3: Operating Hours */}
              <div className="p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Support Schedule</span>
                </div>
                <p className="text-sm font-extrabold text-white">
                  {cmsData.contactDetails.hours}
                </p>
                <p className="text-[11px] text-slate-500">Live turnstile monitoring on show nights</p>
              </div>

              {/* Card 4: Address */}
              <div className="p-5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Australian Headquarters</span>
                </div>
                <p className="text-sm font-extrabold text-white">
                  {cmsData.contactDetails.address}
                </p>
                <p className="text-[11px] text-slate-500">Promoter meetings by appointment</p>
              </div>

            </div>

            {/* =========================================================================
                ORGANISER PORTAL LOGIN (Temporarily commented out - preserved for future use)
            =========================================================================
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-400 text-center sm:text-left">
                Already an approved organiser? Access your live dashboard:
              </p>
              <a
                href="https://admin.mytix.example.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer"
              >
                <span>Organiser Portal Login</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            ========================================================================= */}

          </div>

        </div>
      </section>

    </div>
  );
}
