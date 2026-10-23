"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  MessageCircle, 
  ArrowRight,
  ShieldCheck,
  Search
} from "lucide-react";
import { API_BASE } from "@/config/api";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqData {
  heading: string;
  subheading: string;
  items: FaqItem[];
}

const DEFAULT_FAQ: FaqData = {
  heading: "Frequently Asked Questions",
  subheading: "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds.",
  items: [
    {
      question: "How do I receive and access my tickets after booking?",
      answer: "All tickets on Mytix are 100% digital and paperless. Once your payment is confirmed, your verified QR e-tickets are instantly generated and available in your 'My Tickets' dashboard. You will also receive an email with your booking confirmation and PDF e-ticket with a live scannable QR code."
    },
    {
      question: "How does entry verification work at the venue gates?",
      answer: "Simply open your e-ticket on your mobile phone via Mytix or your confirmation email at the turnstile gate. The event turnstile scanners verify the cryptographic digital signature of your QR code in under a second for fast, fraud-proof admission. No printouts needed!"
    },
    {
      question: "Can I transfer or cancel my tickets if my plans change?",
      answer: "Yes! Depending on the organizer's refund and transfer policy for the show, you can transfer your tickets to a friend's email or request a cancellation directly from your profile dashboard up to 24 hours before the event starts."
    },
    {
      question: "What happens if an event is postponed or cancelled?",
      answer: "If an event is rescheduled, your original tickets remain 100% valid for the new date automatically. If a show is cancelled or you cannot make the rescheduled date, a full refund is automatically issued to your original payment method within 5–7 business days."
    },
    {
      question: "What payment methods are supported on Mytix?",
      answer: "We support all major payment options: UPI (Google Pay, PhonePe, Paytm), Credit & Debit cards (Visa, Mastercard, RuPay, American Express), and Net Banking via safe, bank-grade 256-bit SSL encrypted gateways with instant payment confirmation."
    },
    {
      question: "Are there any hidden charges or unexpected fees at checkout?",
      answer: "Never! Mytix guarantees zero surprise fees. The ticket price shown on the event page clearly itemizes any applicable taxes or booking charges upfront before you proceed to payment."
    }
  ]
};

export default function FaqPage() {
  const [data, setData] = useState<FaqData>(DEFAULT_FAQ);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFaq() {
      try {
        const res = await fetch(`${API_BASE}/faq`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.items) && json.items.length > 0) {
            setData({
              heading: json.heading || DEFAULT_FAQ.heading,
              subheading: json.subheading || DEFAULT_FAQ.subheading,
              items: json.items
            });
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic faq, displaying fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFaq();
  }, []);

  const filteredItems = (data.items || []).filter(
    (item) =>
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      {/* Hero Header */}
      <div className="relative bg-[#070b13] text-white pt-16 pb-18 px-4 sm:px-6 lg:px-8 border-b border-amber-500/20">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold tracking-wide uppercase backdrop-blur-md">
            <HelpCircle className="w-3.5 h-3.5" /> Help & Support Center
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {data.heading}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {data.subheading}
          </p>

          {/* Search Box */}
          <div className="max-w-md mx-auto pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions (e.g., refund, QR code, entry)..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:bg-white/15 backdrop-blur-md transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No questions found matching &quot;{search}&quot;</h3>
            <p className="text-xs text-slate-500">Try searching for something else or contact customer support directly.</p>
          </div>
        ) : (
          filteredItems.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-white border-amber-400/80 shadow-md ring-1 ring-amber-400/20"
                    : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-base sm:text-lg font-bold transition-colors ${
                      isOpen ? "text-amber-600" : "text-slate-900"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "bg-amber-100 text-amber-700 rotate-180"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out px-6 ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100 pb-5"
                      : "grid-rows-[0fr] opacity-0 pb-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal pt-2 border-t border-slate-100">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Contact Us Box */}
        <div className="mt-10 p-6 rounded-2xl bg-linear-to-r from-slate-900 to-slate-950 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Didn&apos;t find your answer?</h4>
              <p className="text-xs text-slate-400">Our customer care team is available 24/7 to help you with anything.</p>
            </div>
          </div>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shrink-0"
          >
            Contact Support <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
