"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import api from "@/lib/api";

function EditEventForm() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Concert",
    posterPath: "",
    status: "PUBLISHED",
    startsAt: "",
    doorsOpenAt: "",
  });

  useEffect(() => {
    if (!eventId) return;
    async function fetchEvent() {
      try {
        const res = await api.get(`/organiser/events/${eventId}`);
        const data = res.data.data;
        setFormData({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "Concert",
          posterPath: data.posterPath || "",
          status: data.status || "PUBLISHED",
          startsAt: data.startsAt ? new Date(data.startsAt).toISOString().slice(0, 16) : "",
          doorsOpenAt: data.doorsOpenAt ? new Date(data.doorsOpenAt).toISOString().slice(0, 16) : "",
        });
      } catch (err) {
        console.error("Failed to load event", err);
        setError("Failed to load event data. It may not exist.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        ...(formData.posterPath && { posterPath: formData.posterPath }),
        startsAt: new Date(formData.startsAt).toISOString(),
        ...(formData.doorsOpenAt && { doorsOpenAt: new Date(formData.doorsOpenAt).toISOString() }),
      };

      await api.patch(`/organiser/events/${eventId}`, payload);
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update event.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
      <header className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Edit Event
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Update your event details.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Poster Image (Required)</label>
                <div className="flex flex-col gap-2">
                  <input 
                    required={!formData.posterPath}
                    type="file" 
                    accept="image/jpeg, image/png, image/webp, image/avif" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formDataPayload = new FormData();
                      formDataPayload.append("file", file);
                      try {
                        const res = await api.post("/uploads/image", formDataPayload, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        setFormData(prev => ({ ...prev, posterPath: res.data.data.url }));
                      } catch (err) {
                        console.error("Failed to upload image", err);
                        alert("Failed to upload image.");
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                  />
                  <p className="text-xs text-slate-500 font-medium">Supported formats: JPG, PNG, WEBP, AVIF</p>
                  {formData.posterPath && (
                    <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Image Set
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  <option value="Concert">Concert</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="POSTPONED">Postponed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Starts At</label>
                <input required type="datetime-local" name="startsAt" value={formData.startsAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Doors Open At (Optional)</label>
                <input type="datetime-local" name="doorsOpenAt" value={formData.doorsOpenAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditEventPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <EditEventForm />
    </Suspense>
  );
}
