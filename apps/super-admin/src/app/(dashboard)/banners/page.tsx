"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  X, 
  Plus, 
  Edit2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Search, 
  RefreshCw,
  Loader2,
  UploadCloud,
  Layers,
  ArrowRight
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal State
  const [bannerToDelete, setBannerToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success / Error Alerts
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchBanners = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get("/admin/banners");
      setBanners(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Filtered Banners
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && b.isActive) ||
        (statusFilter === "INACTIVE" && !b.isActive);
      const matchesQuery = !searchQuery || b.title?.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesStatus && matchesQuery;
    });
  }, [banners, statusFilter, searchQuery]);

  // Derived Counts
  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.isActive).length;
  const inactiveBanners = banners.filter((b) => !b.isActive).length;

  // Toggle active/inactive
  const handleToggleStatus = async (banner: any) => {
    try {
      const updatedStatus = !banner.isActive;
      await api.patch(`/admin/banners/${banner.id}`, {
        isActive: updatedStatus
      });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, isActive: updatedStatus } : b));
      showToast(`Banner marked as ${updatedStatus ? "Active" : "Inactive"}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update banner status");
    }
  };

  // Delete banner handler
  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/banners/${bannerToDelete.id}`);
      setBanners(prev => prev.filter(b => b.id !== bannerToDelete.id));
      setBannerToDelete(null);
      showToast("Banner deleted successfully");
    } catch (err) {
      console.error("Failed to delete banner", err);
      alert("Error deleting banner");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (banner: any) => {
    setEditingBanner(banner);
    setEditTitle(banner.title);
    setEditDisplayOrder(banner.displayOrder || 1);
    setEditImageFile(null);
    setEditImagePreview(banner.imageUrl || "");
  };

  // Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    setIsEditSubmitting(true);
    try {
      let imageUrl = editingBanner.imageUrl;

      if (editImageFile) {
        const formData = new FormData();
        formData.append("file", editImageFile);
        
        const token = useAuthStore.getState().token;
        const uploadRes = await fetch("http://localhost:5000/api/v1/uploads/image?folder=banners", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error?.message || "Failed to upload image");
        }
        imageUrl = uploadData.data.url;
      }

      await api.patch(`/admin/banners/${editingBanner.id}`, {
        title: editTitle,
        imageUrl,
        displayOrder: Number(editDisplayOrder)
      });
      
      setEditingBanner(null);
      setEditTitle("");
      setEditImageFile(null);
      fetchBanners();
      showToast("Banner updated successfully!");
    } catch (err: any) {
      console.error("Failed to update banner", err);
      alert(`Failed: ${err.message || "Error updating banner"}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert("Please select a banner image");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      
      const token = useAuthStore.getState().token;
      const uploadRes = await fetch("http://localhost:5000/api/v1/uploads/image?folder=banners", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || "Failed to upload image");
      }
      
      const imageUrl = uploadData.data.url;

      await api.post("/admin/banners", {
        title,
        imageUrl,
        displayOrder: Number(displayOrder),
        isActive: true
      });
      
      setIsCreateModalOpen(false);
      setTitle("");
      setImageFile(null);
      setImagePreview("");
      fetchBanners();
      showToast("New banner created successfully!");
    } catch (err: any) {
      console.error("Failed to create banner", err);
      alert(`Failed: ${err.message || "Error creating banner"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-7xl pb-24 relative">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ===== HEADER ===== */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-200/60 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
              Hero & Media Slider
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Banners & <span className="text-amber-500">Promotions</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Manage homepage carousel slides, event features, and hero creative banners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toast Notification */}
          {toastMsg && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{toastMsg}</span>
            </div>
          )}

          <button
            onClick={fetchBanners}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh Banners"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : "text-slate-400"}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              setTitle("");
              setImageFile(null);
              setImagePreview("");
              setDisplayOrder(banners.length + 1);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-3 text-xs font-extrabold text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add New Banner</span>
          </button>
        </div>
      </header>

      {/* ===== 4 SUMMARY STAT CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Banners */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-900 bg-[#FFF9EB] px-2.5 py-1 rounded-full border border-amber-200/70">
              Carousel Assets
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Banners</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalBanners}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Stored in Supabase bucket</p>
          </div>
        </div>

        {/* Card 2: Active Banners */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 border border-emerald-200/60 flex items-center justify-center">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              Live on Site
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Slides</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeBanners}</p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
              <span>● Visible to users</span>
            </p>
          </div>
        </div>

        {/* Card 3: Inactive Drafts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-slate-500" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              Draft / Hidden
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactive Slides</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{inactiveBanners}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Offline or scheduled</p>
          </div>
        </div>

        {/* Card 4: Standard Aspect Ratio */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 border border-blue-200/60 flex items-center justify-center">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
              16:9 Standard
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Ratio</p>
            <p className="text-3xl font-black text-slate-900 mt-1">1920 × 1080</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Optimal HD desktop fit</p>
          </div>
        </div>

      </div>

      {/* ===== SEARCH & FILTER BAR ===== */}
      <div className="bg-white rounded-3xl p-5 mb-7 border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banners by title or campaign name..."
            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-11 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Banners" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#FFF9EB] text-amber-950 border border-amber-300/80 shadow-2xs font-extrabold"
                  : "text-slate-500 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* ===== BANNERS GRID ===== */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading media banners...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4 shadow-2xs">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 mb-1">No Banners Found</h3>
          <p className="text-xs font-semibold text-slate-400 max-w-sm mb-6">
            {searchQuery || statusFilter !== "ALL"
              ? "No banners match your search filter criteria."
              : "No promotional banners have been created yet. Add your first hero slide!"}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-6 py-3 text-xs font-black text-slate-950 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map((banner) => (
            <div 
              key={banner.id} 
              className="group relative bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col hover:border-amber-200/80 hover:shadow-lg transition-all"
            >
              {/* Image Preview with 16:9 Aspect Ratio */}
              <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                {banner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}

                {/* Status Badges Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                    banner.isActive 
                      ? "bg-emerald-500/90 text-white border border-emerald-400/50" 
                      : "bg-slate-900/80 text-slate-300 border border-slate-700/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${banner.isActive ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                    {banner.isActive ? "Live" : "Inactive"}
                  </span>

                  {banner.displayOrder && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-900/80 text-white backdrop-blur-md border border-slate-700/50">
                      Order #{banner.displayOrder}
                    </span>
                  )}
                </div>

                {/* Hover Actions Bar */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-3">
                  <button
                    onClick={() => openEditModal(banner)}
                    className="w-10 h-10 rounded-2xl bg-white hover:bg-amber-50 text-slate-900 hover:text-amber-800 flex items-center justify-center transition-all shadow-md hover:scale-110 cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all shadow-md hover:scale-110 cursor-pointer"
                    title={banner.isActive ? "Disable Banner" : "Enable Banner"}
                  >
                    {banner.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setBannerToDelete(banner)}
                    className="w-10 h-10 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-md hover:scale-110 cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Info Card */}
              <div className="p-5 flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <h3 className="text-sm font-black text-slate-900 truncate" title={banner.title}>
                    {banner.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Added {new Date(banner.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <button
                  onClick={() => openEditModal(banner)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-[#FFF9EB] text-slate-600 hover:text-amber-950 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Edit
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ===== CREATE BANNER MODAL ===== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between pb-5 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Add New Banner</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Upload a 16:9 hero banner image for homepage carousel.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Banner Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Coldplay Music of the Spheres World Tour"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Display Order Priority
                </label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              {/* Image Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Banner Image (16:9) <span className="text-red-500">*</span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 shadow-2xs group mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/40 p-5 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs mb-2">
                      <UploadCloud className="w-5 h-5 text-amber-500" />
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      accept="image/jpeg, image/png, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#FFF9EB] file:text-amber-900 cursor-pointer"
                    />
                    <p className="text-[10px] font-semibold text-slate-400 mt-2">
                      Formats: JPG, PNG, WEBP • Max 5MB • 1920×1080 recommended
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !imageFile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] py-3.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Save Banner
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ===== EDIT BANNER MODAL ===== */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between pb-5 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Edit Banner</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Update title, image file, or order sequence.</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingBanner(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Banner Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Display Order Priority
                </label>
                <input
                  type="number"
                  min={1}
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Banner Image (16:9)
                </label>

                {editImagePreview && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 shadow-2xs group mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">
                      {editImageFile ? "New Image Selected" : "Current Active Image"}
                    </span>
                  </div>
                )}

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEditImageFile(file);
                    setEditImagePreview(URL.createObjectURL(file));
                  }}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#FFF9EB] file:text-amber-900 cursor-pointer"
                />
                <p className="text-[10px] font-semibold text-slate-400 mt-1.5">
                  Leave empty to keep the existing image file.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] py-3.5 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200/70 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">Delete Banner?</h3>
            <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete &ldquo;<strong className="text-slate-800">{bannerToDelete.title}</strong>&rdquo;? This will immediately remove it from the homepage carousel.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Keep Banner
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 py-3 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
