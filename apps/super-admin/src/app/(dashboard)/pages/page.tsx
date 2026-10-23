"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Info,
  Phone,
  Mail,
  Building2,
  Clock,
  MapPin,
  HelpCircle,
  MessageCircle
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

// ─── TYPE DEFINITIONS ──────────────────────────────────────

interface AboutStat {
  label: string;
  value: string;
  sub: string;
}

interface AboutValue {
  title: string;
  desc: string;
}

interface AboutUsData {
  heroTagline: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  stats: AboutStat[];
  narrativeTagline: string;
  narrativeTitle: string;
  narrativeParagraphs: string[];
  featureBoxTitle: string;
  featureBoxDescription: string;
  featureBoxBadge: string;
  values: AboutValue[];
  valuesHeading: string;
  valuesSubheading: string;
  ctaTitle: string;
  ctaDescription: string;
}

interface ContactCard {
  title: string;
  subtitle: string;
  actionText: string;
  actionHref: string;
  badge: string;
  iconType: string;
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

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqData {
  heading: string;
  subheading: string;
  items: FaqItem[];
}

type TabKey = "about" | "contact" | "faq";

// ─── COMPONENT ─────────────────────────────────────────────

export default function PagesCMSPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  // Loading / saving state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Data for each tab
  const [aboutUs, setAboutUs] = useState<AboutUsData | null>(null);
  const [contactUs, setContactUs] = useState<ContactUsData | null>(null);
  const [faq, setFaq] = useState<FaqData | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aboutRes, contactRes, faqRes] = await Promise.all([
        api.get("/admin/about-us"),
        api.get("/admin/contact-us"),
        api.get("/admin/faq"),
      ]);
      if (aboutRes.data?.data) setAboutUs(aboutRes.data.data);
      if (contactRes.data?.data) setContactUs(contactRes.data.data);
      if (faqRes.data?.data) setFaq(faqRes.data.data);
    } catch (err: any) {
      console.warn("Could not load page data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      if (activeTab === "about" && aboutUs) {
        const res = await api.put("/admin/about-us", aboutUs);
        if (res.data?.data) setAboutUs(res.data.data);
      } else if (activeTab === "contact" && contactUs) {
        const res = await api.put("/admin/contact-us", contactUs);
        if (res.data?.data) setContactUs(res.data.data);
      } else if (activeTab === "faq" && faq) {
        const res = await api.put("/admin/faq", faq);
        if (res.data?.data) setFaq(res.data.data);
      }
      const labels = { about: "About Us", contact: "Contact Us", faq: "FAQ" };
      setSuccessMsg(`${labels[activeTab]} page published successfully! Changes are now live on the user website.`);
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Access guard
  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Super-Admin Access Required</h2>
        <p className="text-slate-500 max-w-md mt-2 text-sm leading-relaxed">
          Only platform Super-Admins have permission to manage website pages.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Loading Pages CMS...</span>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "about", label: "About Us" },
    { key: "contact", label: "Contact Us" },
    { key: "faq", label: "FAQ" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pages CMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Edit About Us, Contact Us, and FAQ pages displayed on the user website.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Publishing..." : "Publish Changes"}
        </button>
      </div>

      {/* Alerts */}
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

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-2xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === tab.key
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "about" && aboutUs && <AboutUsEditor data={aboutUs} onChange={setAboutUs} />}
      {activeTab === "contact" && contactUs && <ContactUsEditor data={contactUs} onChange={setContactUs} />}
      {activeTab === "faq" && faq && <FaqEditor data={faq} onChange={setFaq} />}
    </div>
  );
}

// ─── ABOUT US EDITOR ───────────────────────────────────────

function AboutUsEditor({ data, onChange }: { data: AboutUsData; onChange: (d: AboutUsData) => void }) {
  const update = (key: keyof AboutUsData, val: any) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Hero Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Hero Tagline" value={data.heroTagline} onChange={(v) => update("heroTagline", v)} />
          <InputField label="Hero Title" value={data.heroTitle} onChange={(v) => update("heroTitle", v)} />
          <InputField label="Hero Highlight Text" value={data.heroHighlight} onChange={(v) => update("heroHighlight", v)} />
        </div>
        <TextareaField label="Hero Description" value={data.heroDescription} onChange={(v) => update("heroDescription", v)} rows={3} />
      </div>

      {/* Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Statistics ({data.stats.length})</h3>
          <button
            type="button"
            onClick={() => update("stats", [...data.stats, { label: "New Stat", value: "0", sub: "Description" }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Stat
          </button>
        </div>
        {data.stats.map((stat, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <InputField label="Value" value={stat.value} onChange={(v) => {
              const next = [...data.stats]; next[i] = { ...next[i], value: v }; update("stats", next);
            }} />
            <InputField label="Label" value={stat.label} onChange={(v) => {
              const next = [...data.stats]; next[i] = { ...next[i], label: v }; update("stats", next);
            }} />
            <InputField label="Subtitle" value={stat.sub} onChange={(v) => {
              const next = [...data.stats]; next[i] = { ...next[i], sub: v }; update("stats", next);
            }} />
            <button
              type="button"
              onClick={() => update("stats", data.stats.filter((_, j) => j !== i))}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer self-end"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Narrative */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Narrative Section</h3>
        <InputField label="Section Tagline" value={data.narrativeTagline} onChange={(v) => update("narrativeTagline", v)} />
        <InputField label="Section Title" value={data.narrativeTitle} onChange={(v) => update("narrativeTitle", v)} />
        {data.narrativeParagraphs.map((p, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1">
              <TextareaField
                label={`Paragraph ${i + 1}`}
                value={p}
                onChange={(v) => {
                  const next = [...data.narrativeParagraphs]; next[i] = v; update("narrativeParagraphs", next);
                }}
                rows={3}
              />
            </div>
            <button
              type="button"
              onClick={() => update("narrativeParagraphs", data.narrativeParagraphs.filter((_, j) => j !== i))}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-6 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => update("narrativeParagraphs", [...data.narrativeParagraphs, ""])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Paragraph
        </button>
      </div>

      {/* Feature Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Feature Highlight Box</h3>
        <InputField label="Title" value={data.featureBoxTitle} onChange={(v) => update("featureBoxTitle", v)} />
        <TextareaField label="Description" value={data.featureBoxDescription} onChange={(v) => update("featureBoxDescription", v)} rows={3} />
        <InputField label="Badge Text" value={data.featureBoxBadge} onChange={(v) => update("featureBoxBadge", v)} />
      </div>

      {/* Values */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Core Values ({data.values.length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Each value is a card shown in the "What sets us apart" section.</p>
          </div>
          <button
            type="button"
            onClick={() => update("values", [...data.values, { title: "New Value", desc: "Description..." }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Value
          </button>
        </div>
        <InputField label="Section Heading" value={data.valuesHeading} onChange={(v) => update("valuesHeading", v)} />
        <InputField label="Section Subheading" value={data.valuesSubheading} onChange={(v) => update("valuesSubheading", v)} />
        {data.values.map((val, i) => (
          <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <InputField label={`Value ${i + 1} Title`} value={val.title} onChange={(v) => {
                  const next = [...data.values]; next[i] = { ...next[i], title: v }; update("values", next);
                }} />
              </div>
              <button
                type="button"
                onClick={() => update("values", data.values.filter((_, j) => j !== i))}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-4 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <TextareaField label="Description" value={val.desc} onChange={(v) => {
              const next = [...data.values]; next[i] = { ...next[i], desc: v }; update("values", next);
            }} rows={3} />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Call to Action Banner</h3>
        <InputField label="CTA Title" value={data.ctaTitle} onChange={(v) => update("ctaTitle", v)} />
        <InputField label="CTA Description" value={data.ctaDescription} onChange={(v) => update("ctaDescription", v)} />
      </div>
    </div>
  );
}

// ─── CONTACT US EDITOR ─────────────────────────────────────

function ContactUsEditor({ data, onChange }: { data: ContactUsData; onChange: (d: ContactUsData) => void }) {
  const update = (key: keyof ContactUsData, val: any) => onChange({ ...data, [key]: val });

  const iconOptions = [
    { value: "mail", label: "Email (Mail)" },
    { value: "phone", label: "Phone" },
    { value: "building", label: "Building" },
    { value: "clock", label: "Clock" },
    { value: "mappin", label: "Location" },
    { value: "help", label: "Help" },
    { value: "message", label: "Message" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Hero Section</h3>
        <InputField label="Hero Tagline" value={data.heroTagline} onChange={(v) => update("heroTagline", v)} />
        <InputField label="Hero Title" value={data.heroTitle} onChange={(v) => update("heroTitle", v)} />
        <TextareaField label="Hero Description" value={data.heroDescription} onChange={(v) => update("heroDescription", v)} rows={3} />
      </div>

      {/* Contact Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Contact Cards ({data.contactCards.length})</h3>
          <button
            type="button"
            onClick={() => update("contactCards", [...data.contactCards, {
              title: "New Contact Method",
              subtitle: "Description",
              actionText: "action@example.com",
              actionHref: "mailto:action@example.com",
              badge: "New",
              iconType: "mail"
            }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Card
          </button>
        </div>

        {data.contactCards.map((card, i) => (
          <div key={i} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Title" value={card.title} onChange={(v) => {
                  const next = [...data.contactCards]; next[i] = { ...next[i], title: v }; update("contactCards", next);
                }} />
                <InputField label="Badge" value={card.badge} onChange={(v) => {
                  const next = [...data.contactCards]; next[i] = { ...next[i], badge: v }; update("contactCards", next);
                }} />
              </div>
              <button
                type="button"
                onClick={() => update("contactCards", data.contactCards.filter((_, j) => j !== i))}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-4 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <InputField label="Subtitle" value={card.subtitle} onChange={(v) => {
              const next = [...data.contactCards]; next[i] = { ...next[i], subtitle: v }; update("contactCards", next);
            }} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InputField label="Action Text" value={card.actionText} onChange={(v) => {
                const next = [...data.contactCards]; next[i] = { ...next[i], actionText: v }; update("contactCards", next);
              }} />
              <InputField label="Action Link (href)" value={card.actionHref} onChange={(v) => {
                const next = [...data.contactCards]; next[i] = { ...next[i], actionHref: v }; update("contactCards", next);
              }} />
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Icon Type</label>
                <select
                  value={card.iconType}
                  onChange={(e) => {
                    const next = [...data.contactCards]; next[i] = { ...next[i], iconType: e.target.value }; update("contactCards", next);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Office Locations */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Office Locations ({data.offices.length})</h3>
          <button
            type="button"
            onClick={() => update("offices", [...data.offices, { label: "New Office", address: "Address", city: "City, State, Country" }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Office
          </button>
        </div>
        {data.offices.map((office, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <InputField label="Label" value={office.label} onChange={(v) => {
              const next = [...data.offices]; next[i] = { ...next[i], label: v }; update("offices", next);
            }} />
            <InputField label="Address" value={office.address} onChange={(v) => {
              const next = [...data.offices]; next[i] = { ...next[i], address: v }; update("offices", next);
            }} />
            <InputField label="City / State" value={office.city} onChange={(v) => {
              const next = [...data.offices]; next[i] = { ...next[i], city: v }; update("offices", next);
            }} />
            <button
              type="button"
              onClick={() => update("offices", data.offices.filter((_, j) => j !== i))}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer self-end"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAQ EDITOR ────────────────────────────────────────────

function FaqEditor({ data, onChange }: { data: FaqData; onChange: (d: FaqData) => void }) {
  const update = (key: keyof FaqData, val: any) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">FAQ Section Heading</h3>
        <InputField label="Heading" value={data.heading} onChange={(v) => update("heading", v)} />
        <InputField label="Subheading" value={data.subheading} onChange={(v) => update("subheading", v)} />
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              FAQ Items ({data.items.length})
            </h3>
            <p className="text-xs text-slate-500">Each item appears as an accordion on the homepage and FAQ section.</p>
          </div>
          <button
            type="button"
            onClick={() => update("items", [...data.items, { question: "New Question?", answer: "Enter the answer here..." }])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </div>

        {data.items.map((item, index) => (
          <div
            key={index}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Question {index + 1}
                </label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => {
                    const next = [...data.items]; next[index] = { ...next[index], question: e.target.value }; update("items", next);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="button"
                onClick={() => update("items", data.items.filter((_, j) => j !== index))}
                title="Delete FAQ"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-4 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Answer
              </label>
              <textarea
                rows={4}
                value={item.answer}
                onChange={(e) => {
                  const next = [...data.items]; next[index] = { ...next[index], answer: e.target.value }; update("items", next);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED FORM COMPONENTS ────────────────────────────────

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
        placeholder={placeholder || label}
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400"
        placeholder={placeholder || label}
      />
    </div>
  );
}
