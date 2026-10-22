"use client";

import { useState, useEffect } from "react";
import { 
  Share2, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Eye,
  Check,
  Globe
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

export interface SocialLinkItem {
  id: string;
  name: string;
  url: string;
  letter: string;
  isActive: boolean;
}

const DEFAULT_LINKS: SocialLinkItem[] = [
  { id: "facebook", name: "facebook", url: "https://facebook.com", letter: "F", isActive: true },
  { id: "twitter", name: "twitter", url: "https://x.com", letter: "X", isActive: true },
  { id: "youtube", name: "youtube", url: "https://youtube.com", letter: "Y", isActive: true },
  { id: "instagram", name: "instagram", url: "https://instagram.com", letter: "I", isActive: true },
];

export default function SocialLinksAdminPage() {
  const user = useAuthStore((state) => state.user);
  const [links, setLinks] = useState<SocialLinkItem[]>(DEFAULT_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // New Link Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newLetter, setNewLetter] = useState("");

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/social-links");
      if (res.data?.data && Array.isArray(res.data.data)) {
        setLinks(res.data.data);
      }
    } catch (err: any) {
      console.warn("Could not load stored social links, using defaults:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await api.put("/admin/social-links", links);
      if (res.data?.data) {
        setLinks(res.data.data);
      }

      setSuccessMsg("Social media links saved & published to user footer!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to save social links.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all social media links to default development homepages (Facebook, X/Twitter, YouTube, Instagram)?")) {
      setLinks(DEFAULT_LINKS);
    }
  };

  const handleToggleActive = (id: string) => {
    setLinks(prev => prev.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item));
  };

  const handleDelete = (id: string) => {
    setLinks(prev => prev.filter(item => item.id !== id));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= links.length) return;
    const reordered = [...links];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    setLinks(reordered);
  };

  const handleUpdateField = (id: string, field: keyof SocialLinkItem, val: string) => {
    setLinks(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handlePlatformNameChange = (val: string) => {
    setNewPlatform(val);
    if (!newLetter || newLetter.length <= 1) {
      setNewLetter(val.trim().charAt(0).toUpperCase());
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatform.trim() || !newUrl.trim()) return;

    let cleanUrl = newUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const newItem: SocialLinkItem = {
      id: `social-${Date.now()}`,
      name: newPlatform.trim().toLowerCase(),
      url: cleanUrl,
      letter: (newLetter.trim() || newPlatform.trim().charAt(0)).toUpperCase().slice(0, 3),
      isActive: true,
    };

    setLinks(prev => [...prev, newItem]);
    setNewPlatform("");
    setNewUrl("");
    setNewLetter("");
    setShowAddForm(false);
  };

  const activeLinks = links.filter(l => l.isActive);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* ===== HEADER ===== */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Social Media Links
            </h1>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
              Footer Config
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Add and manage dynamic social media icons and links displayed in the user-facing website footer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all cursor-pointer"
            title="Reset to default development homepages"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-extrabold shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Publish Links</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ===== LIVE FOOTER PREVIEW (DARK MODE) ===== */}
      <section className="rounded-3xl bg-[#1e1e24] p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-slate-700/60 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Live User-Side Footer Preview
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {activeLinks.length} Active {activeLinks.length === 1 ? "Link" : "Links"} Visible
          </span>
        </div>

        {/* Realistic Footer Snippet */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-3xl font-black tracking-tighter text-white mb-6">
            Mytix<span className="text-red-500">.</span>
          </div>

          {activeLinks.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No active social links to show.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              {activeLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center transition-transform hover:-translate-y-1"
                >
                  {/* Circle Icon with first letter */}
                  <div className="w-11 h-11 rounded-full border border-gray-600 bg-[#2d2d34] flex items-center justify-center font-black text-white text-base shadow-md group-hover:bg-white group-hover:text-[#1e1e24] group-hover:border-white transition-all">
                    {item.letter || item.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Text label underneath */}
                  <span className="mt-2 text-xs font-medium text-gray-400 group-hover:text-white transition-colors lowercase">
                    {item.name}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== LIST & MANAGEMENT CARD ===== */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">Manage Social Links</h2>
            <p className="text-sm font-semibold text-slate-400">
              Configure URLs, circular letter badges, and toggle visibility for each platform.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-extrabold text-sm border border-amber-200/80 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-600" />
            <span>Add Social Link</span>
          </button>
        </div>

        {/* Add Form Accordion */}
        {showAddForm && (
          <form onSubmit={handleAddLink} className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                New Social Media Link
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Platform Name (e.g. facebook, discord, tiktok)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. facebook"
                  value={newPlatform}
                  onChange={(e) => handlePlatformNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Circle Letter (Icon)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  placeholder="F"
                  value={newLetter}
                  onChange={(e) => setNewLetter(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-black text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target URL (Homepage or Profile Link)
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://facebook.com/yourpage"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
              >
                Add to List
              </button>
            </div>
          </form>
        )}

        {/* Links Table / Card List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" />
            <span className="text-sm font-bold">Loading social links...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-slate-600">No social links configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;Add Social Link&quot; or &quot;Reset Defaults&quot; above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  item.isActive 
                    ? "bg-slate-50/70 border-slate-200/80" 
                    : "bg-slate-100/50 border-dashed border-slate-200 opacity-60"
                }`}
              >
                {/* Left: Reorder buttons & Circular Letter Preview */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === links.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Circular badge */}
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    {item.letter || item.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase text-slate-800 block">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 block truncate max-w-[200px] sm:max-w-xs">
                      {item.url}
                    </span>
                  </div>
                </div>

                {/* Middle: Editable Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-xl">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateField(item.id, "name", e.target.value)}
                    placeholder="Platform name"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    maxLength={3}
                    value={item.letter}
                    onChange={(e) => handleUpdateField(item.id, "letter", e.target.value.toUpperCase())}
                    placeholder="Initial (e.g. F)"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
                  />
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => handleUpdateField(item.id, "url", e.target.value)}
                    placeholder="URL (https://...)"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      item.isActive
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {item.isActive ? "Active" : "Hidden"}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Test Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl text-red-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                    title="Delete Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
