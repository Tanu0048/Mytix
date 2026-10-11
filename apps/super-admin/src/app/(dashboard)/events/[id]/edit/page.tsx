"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Ticket } from "lucide-react";
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

  const [ticketTypes, setTicketTypes] = useState<any[]>([]);

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

        // Populate ticket tiers
        if (data.ticketTypes && Array.isArray(data.ticketTypes)) {
          setTicketTypes(data.ticketTypes.map((t: any) => ({
            id: t.id,
            name: t.name || "",
            priceCents: t.priceCents || 0,
            quantity: t.quantity || 100,
            sold: t.sold || 0,
            available: t.available ?? t.quantity,
            saleStartsAt: t.saleStartsAt ? new Date(t.saleStartsAt).toISOString().slice(0, 16) : "",
            saleEndsAt: t.saleEndsAt ? new Date(t.saleEndsAt).toISOString().slice(0, 16) : "",
            minPerOrder: t.minPerOrder || 1,
            maxPerOrder: t.maxPerOrder || 10
          })));
        }
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

  const handleTicketChange = (index: number, field: string, value: any) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      {
        name: "",
        priceCents: 5000,
        quantity: 100,
        sold: 0,
        available: 100,
        saleStartsAt: formData.startsAt || "",
        saleEndsAt: formData.startsAt || "",
        minPerOrder: 1,
        maxPerOrder: 10
      }
    ]);
  };

  const removeTicketType = (index: number) => {
    const tier = ticketTypes[index];
    if (tier.sold && tier.sold > 0) {
      alert(`Cannot delete '${tier.name}' because ${tier.sold} tickets have already been booked! You can reduce or increase the quantity instead.`);
      return;
    }
    if (ticketTypes.length === 1) {
      alert("An event must have at least one ticket tier.");
      return;
    }
    const updated = [...ticketTypes];
    updated.splice(index, 1);
    setTicketTypes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        ...(formData.posterPath && { posterPath: formData.posterPath }),
        ...(formData.startsAt && { startsAt: new Date(formData.startsAt).toISOString() }),
        ...(formData.doorsOpenAt && { doorsOpenAt: new Date(formData.doorsOpenAt).toISOString() }),
        ticketTypes: ticketTypes.map((t) => ({
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          priceCents: Number(t.priceCents),
          quantity: Number(t.quantity),
          ...(t.saleStartsAt ? { saleStartsAt: new Date(t.saleStartsAt).toISOString() } : {}),
          ...(t.saleEndsAt ? { saleEndsAt: new Date(t.saleEndsAt).toISOString() } : {}),
          minPerOrder: Number(t.minPerOrder || 1),
          maxPerOrder: Number(t.maxPerOrder || 10)
        }))
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
      <header className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Edit <span className="text-amber-500">Event</span>
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Update event details, dates, and ticketing tiers.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details Card */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 mb-6 border-b border-slate-100 pb-3">Basic Details</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Poster Image</label>
                <div className="flex flex-col gap-2">
                  <input 
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                  />
                  {formData.posterPath && (
                    <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Poster Image Attached
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white">
                  <option value="Concert">Concert</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white">
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
                <input required type="datetime-local" name="startsAt" value={formData.startsAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Doors Open At (Optional)</label>
                <input type="datetime-local" name="doorsOpenAt" value={formData.doorsOpenAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Ticketing Tiers Card */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Ticketing Tiers</h2>
              <p className="text-sm font-medium text-slate-400 mt-0.5">Manage ticket types, pricing, and available seat inventory.</p>
            </div>
            <button 
              type="button" 
              onClick={addTicketType} 
              className="flex items-center gap-1.5 text-sm font-extrabold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-2 rounded-xl transition-colors border border-amber-200/60"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add Tier
            </button>
          </div>

          <div className="space-y-6">
            {ticketTypes.map((ticket, index) => (
              <div key={ticket.id || index} className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 relative">
                {ticketTypes.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeTicketType(index)} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Delete tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Sold status info if existing */}
                {ticket.sold !== undefined && ticket.sold > 0 && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/60 rounded-full text-[11px] font-bold text-blue-700">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{ticket.sold} tickets already sold • {ticket.available} remaining</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tier Name</label>
                    <input 
                      required 
                      type="text" 
                      value={ticket.name} 
                      onChange={(e) => handleTicketChange(index, "name", e.target.value)} 
                      placeholder="e.g. VIP, General" 
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Price (in cents)</label>
                    <input 
                      required 
                      type="number" 
                      value={ticket.priceCents} 
                      onChange={(e) => handleTicketChange(index, "priceCents", e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" 
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">₹{(ticket.priceCents / 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Total Quantity</label>
                    <input 
                      required 
                      type="number" 
                      min={ticket.sold || 1}
                      value={ticket.quantity} 
                      onChange={(e) => handleTicketChange(index, "quantity", e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" 
                    />
                    {ticket.sold > 0 && (
                      <span className="text-[10px] text-slate-400 mt-1 block">Min {ticket.sold} (already sold)</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sale Starts At</label>
                    <input 
                      type="datetime-local" 
                      value={ticket.saleStartsAt} 
                      onChange={(e) => handleTicketChange(index, "saleStartsAt", e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sale Ends At</label>
                    <input 
                      type="datetime-local" 
                      value={ticket.saleEndsAt} 
                      onChange={(e) => handleTicketChange(index, "saleEndsAt", e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-8 py-3.5 text-sm font-black text-slate-950 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 stroke-[2.5]" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditEventPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>}>
      <EditEventForm />
    </Suspense>
  );
}
