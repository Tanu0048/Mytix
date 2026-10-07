"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Upload, Trash2, X, Plus, Edit2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New banner state
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit banner state
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/banners");
      setBanners(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete banner", err);
      alert("Error deleting banner");
    }
  };

  const openEditModal = (banner: any) => {
    setEditingBanner(banner);
    setEditTitle(banner.title);
    setEditImageFile(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    setIsEditSubmitting(true);
    try {
      let imageUrl = editingBanner.imageUrl;

      // 1. Upload new image if provided
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
          throw new Error(uploadData.error?.message || "Failed to upload new image");
        }
        imageUrl = uploadData.data.url;
      }

      // 2. Update the banner record
      await api.patch(`/admin/banners/${editingBanner.id}`, {
        title: editTitle,
        imageUrl,
      });
      
      setEditingBanner(null);
      setEditTitle("");
      setEditImageFile(null);
      fetchBanners();
    } catch (err: any) {
      console.error("Failed to update banner", err);
      const errorMessage = err.response?.data?.error?.message || err.message || "Error updating banner";
      alert(`Failed: ${errorMessage}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert("Please select an image");

    setIsSubmitting(true);
    try {
      // 1. Upload the image file first
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

      // 2. Create the banner record
      await api.post("/admin/banners", {
        title,
        imageUrl,
        displayOrder: 1,
        isActive: true
      });
      
      setIsModalOpen(false);
      setTitle("");
      setImageFile(null);
      fetchBanners();
    } catch (err: any) {
      console.error("Failed to create banner", err);
      const errorMessage = err.response?.data?.error?.message || err.message || "Error creating banner";
      alert(`Failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Banners Management
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Manage homepage banners and promotional images.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" /> Add New Banner
        </button>
      </header>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400 font-semibold">
          Loading banners...
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-300">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold text-sm">No banners found. Add your first banner!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
              <div className="aspect-video w-full bg-slate-100 flex items-center justify-center relative overflow-hidden">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    onClick={() => openEditModal(banner)}
                    className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                    title="Edit Banner"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(banner.id)}
                    className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete Banner"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900 line-clamp-1 flex-1 pr-2" title={banner.title}>{banner.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${banner.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for editing banner */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Banner</h2>
              <button onClick={() => setEditingBanner(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Banner Title</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Upload New Image (Optional)</label>
                {editImageFile ? (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative">
                    <img src={URL.createObjectURL(editImageFile)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : editingBanner?.imageUrl ? (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative">
                    <img src={editingBanner.imageUrl} alt="Current" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-slate-900/60 text-white text-[10px] px-2 py-1 rounded-md font-semibold">Current Image</div>
                  </div>
                ) : null}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200 transition-all cursor-pointer" 
                />
                <p className="text-xs text-slate-500 mt-2">Leave empty to keep the existing image.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingBanner(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isEditSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isEditSubmitting ? "Updating..." : "Update Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for creating new banner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Banner</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Banner Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="e.g. Summer Music Fest Promo" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Upload Image</label>
                {imageFile && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  required
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200 transition-all cursor-pointer" 
                />
                <ul className="text-xs text-slate-500 mt-2 font-medium list-disc list-inside space-y-1">
                  <li><strong>Max File Size:</strong> 5 MB</li>
                  <li><strong>Format:</strong> .jpg, .jpeg, .png, .webp (AVIF not supported)</li>
                  <li><strong>Dimension:</strong> 16:9 ratio (e.g. 1920x1080)</li>
                </ul>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Uploading..." : <><Upload className="h-4 w-4" /> Save Banner</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
