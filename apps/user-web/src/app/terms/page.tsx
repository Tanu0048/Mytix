"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  Calendar, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles, 
  Printer, 
  ArrowLeft,
  HelpCircle,
  Mail
} from "lucide-react";
import { API_BASE } from "@/config/api";

interface TermSection {
  id?: string;
  title: string;
  content: string;
}

interface TermsData {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: TermSection[];
}

const DEFAULT_TERMS: TermsData = {
  title: "Terms and Conditions of Service",
  subtitle: "Please read these terms carefully before booking tickets or using the Mytix entertainment platform.",
  lastUpdated: "October 2026",
  sections: [
    {
      id: "agreement",
      title: "1. Agreement to Terms",
      content: "By accessing or using Mytix (the 'Platform'), purchasing tickets, registering an account, or attending any event ticketed through our service, you agree to be legally bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any provision of these terms, you must not use our website, mobile application, or purchase tickets."
    },
    {
      id: "ticketing",
      title: "2. Digital Ticketing & Admission",
      content: "All tickets issued through Mytix are 100% digital electronic admissions secured with high-grade cryptographic QR verification signatures. Each QR code is strictly valid for a single entry scan at venue turnstiles. Duplicated, altered, or unreadable tickets will be denied entry by venue gate operators without entitlement to compensation."
    },
    {
      id: "pricing",
      title: "3. Pricing, Taxes & Payment Gateway",
      content: "All ticket prices are listed in Australian Dollars (AUD) or relevant local currency inclusive of statutory Goods and Services Tax (GST) unless explicitly noted otherwise. Payment must be made in full through authorized bank gateways (credit/debit cards, Apple Pay, Google Pay). Mytix guarantees complete price transparency with zero hidden surprise fees at final checkout."
    },
    {
      id: "cancellation",
      title: "4. Event Cancellation, Rescheduling & Refunds",
      content: "In the event that a concert, festival, or show is officially cancelled by the artist or event organizer, full ticket refunds will be automatically returned to your original payment method in compliance with Australian Consumer Law (ACL). If an event is postponed or rescheduled, existing tickets remain valid for the newly announced date."
    },
    {
      id: "venue-rules",
      title: "5. Venue Conduct & Admission Rights",
      content: "Ticket holders must adhere to all individual venue regulations, security checks, bag inspections, and age restrictions (e.g. 18+ valid photo ID requirements). Venue management and organizers reserve the right to refuse entry or eject individuals demonstrating disorderly, abusive, or unsafe behavior."
    },
    {
      id: "resale",
      title: "6. Resale & Scalping Prohibition",
      content: "Tickets may not be scalped, resold for commercial gain, or transferred via unauthorized third-party secondary ticketing sites at prices exceeding 110% of face value in accordance with Australian state anti-scalping legislation."
    },
    {
      id: "liability",
      title: "7. Limitation of Liability",
      content: "To the maximum extent permitted by applicable law, Mytix acts as a ticketing agent on behalf of independent event organizers and shall not be held liable for personal injury, property loss, or artist performance changes beyond our direct operational control."
    }
  ]
};

export default function TermsPage() {
  const [terms, setTerms] = useState<TermsData>(DEFAULT_TERMS);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<number>(0);

  useEffect(() => {
    async function loadDynamicTerms() {
      try {
        const res = await fetch(`${API_BASE}/terms`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.sections && data.sections.length > 0) {
            setTerms(data);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic terms, displaying fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDynamicTerms();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      {/* Hero Header */}
      <div className="relative bg-[#070b13] text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Australian Ticketing Standard
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {terms.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {terms.subtitle}
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs text-amber-400 font-bold">
            <span className="flex items-center gap-1.5 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
              <Calendar className="w-3.5 h-3.5" /> Effective: {terms.lastUpdated}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        
        {/* Mobile / Tablet Quick Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Table of Contents (Desktop Sticky Sidebar) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {terms.sections.map((section, idx) => (
                  <a
                    key={idx}
                    href={`#section-${idx}`}
                    onClick={() => setActiveSection(idx)}
                    className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                      activeSection === idx 
                        ? 'bg-amber-50 text-amber-700 border-l-3 border-amber-500 font-black' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Terms
                </button>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  <Mail className="w-3.5 h-3.5" /> Legal Support
                </Link>
              </div>
            </div>
          </div>

          {/* Clauses Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
              
              {terms.sections.map((section, index) => (
                <div 
                  key={index} 
                  id={`section-${index}`}
                  className="scroll-mt-28 space-y-3 pb-8 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal whitespace-pre-line pl-8.5">
                    {section.content}
                  </p>
                </div>
              ))}

              {/* Bottom Support Note */}
              <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Questions regarding these terms?</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Our compliance team is available to clarify any ticketing or legal policy inquiry.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shrink-0"
                >
                  Contact Compliance
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
