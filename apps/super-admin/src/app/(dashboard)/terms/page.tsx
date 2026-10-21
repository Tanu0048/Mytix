"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  HelpCircle
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

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

const DEFAULT_TERMS_FALLBACK: TermsData = {
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

export default function SuperAdminTermsPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [terms, setTerms] = useState<TermsData>(DEFAULT_TERMS_FALLBACK);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/terms");
      if (res.data?.data) {
        setTerms(res.data.data);
      }
    } catch (err: any) {
      console.warn("Could not load stored terms, using default template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await api.put("/admin/terms", terms);
      if (res.data?.data) {
        setTerms(res.data.data);
      }
      setSuccessMsg("Terms & Conditions published successfully! Live users will now see these updated terms.");
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to save terms. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    setTerms(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}`,
          title: `${prev.sections.length + 1}. New Policy Clause`,
          content: "Enter the detailed terms, rules, and conditions for this section here..."
        }
      ]
    }));
  };

  const handleRemoveSection = (index: number) => {
    setTerms(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleSectionChange = (index: number, field: "title" | "content", value: string) => {
    setTerms(prev => {
      const nextSections = [...prev.sections];
      nextSections[index] = {
        ...nextSections[index],
        [field]: value
      };
      return { ...prev, sections: nextSections };
    });
  };

  // Strictly enforce super-admin access only
  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Super-Admin Access Required</h2>
        <p className="text-slate-500 max-w-md mt-2 text-sm leading-relaxed">
          Only platform Super-Admins have permission to manage global platform legal policies and Terms & Conditions. Event Organisers cannot modify these settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading Terms & Conditions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Terms & Conditions Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Super-Admin Control Panel: Edit and publish live legal terms displayed across Mytix.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? "Edit Mode" : "Live Preview"}
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Publishing..." : "Publish Terms"}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-sm font-semibold flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preview Mode */}
      {previewMode ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-100 text-amber-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Live Preview
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{terms.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{terms.subtitle}</p>
            <p className="text-xs text-amber-600 font-bold mt-2">Last Updated: {terms.lastUpdated}</p>
          </div>

          <div className="space-y-6">
            {terms.sections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Edit Form */
        <div className="space-y-6">
          {/* Header Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Page Title
                </label>
                <input
                  type="text"
                  value={terms.title}
                  onChange={(e) => setTerms({ ...terms, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                  placeholder="Terms and Conditions of Service"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Last Updated Date / Version
                </label>
                <input
                  type="text"
                  value={terms.lastUpdated}
                  onChange={(e) => setTerms({ ...terms, lastUpdated: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. October 2026"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subtitle / Description
              </label>
              <input
                type="text"
                value={terms.subtitle}
                onChange={(e) => setTerms({ ...terms, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                placeholder="Please read these terms carefully before booking tickets..."
              />
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Policy Sections ({terms.sections.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Each section represents a distinct legal clause shown to users.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Clause
              </button>
            </div>

            {terms.sections.map((section, index) => (
              <div 
                key={index} 
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Clause {index + 1} Heading
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleSectionChange(index, "title", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSection(index)}
                    title="Delete section"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-4 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Clause Text & Rules
                  </label>
                  <textarea
                    rows={4}
                    value={section.content}
                    onChange={(e) => handleSectionChange(index, "content", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset all terms to the default Australian ticketing standard?")) {
                  setTerms(DEFAULT_TERMS_FALLBACK);
                }
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Reset to Recommended Default
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black transition shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Publishing Terms..." : "Publish Terms & Conditions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
