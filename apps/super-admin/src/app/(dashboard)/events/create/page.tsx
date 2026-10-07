"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";

export default function CreateEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [venues, setVenues] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueCity, setNewVenueCity] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Concert",
    posterPath: "",
    startsAt: "",
    doorsOpenAt: "",
    venueId: "",
    artistId: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [vRes, aRes] = await Promise.all([
          fetch("http://localhost:5000/api/v1/venues"),
          fetch("http://localhost:5000/api/v1/artists")
        ]);
        
        if (vRes.ok) {
          const vData = await vRes.json();
          setVenues(vData);
          if (vData.length > 0) {
            setFormData(prev => ({ ...prev, venueId: vData[0].id }));
          }
        }
        
        if (aRes.ok) {
          const aData = await aRes.json();
          setArtists(aData);
          if (aData.length > 0) {
            setFormData(prev => ({ ...prev, artistId: aData[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load venues/artists", err);
      }
    }
    loadData();
  }, []);

  const [ticketTypes, setTicketTypes] = useState([
    {
      name: "General Admission",
      priceCents: 5000,
      quantity: 100,
      saleStartsAt: "",
      saleEndsAt: "",
      minPerOrder: 1,
      maxPerOrder: 10
    }
  ]);

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
    setTicketTypes([...ticketTypes, {
      name: "",
      priceCents: 0,
      quantity: 100,
      saleStartsAt: "",
      saleEndsAt: "",
      minPerOrder: 1,
      maxPerOrder: 10
    }]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length === 1) return;
    const updated = [...ticketTypes];
    updated.splice(index, 1);
    setTicketTypes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let finalVenueId = formData.venueId;
      if (finalVenueId === "NEW") {
        if (!newVenueName || !newVenueCity) {
          setError("Please enter both City and Venue Name for the new venue.");
          setIsLoading(false);
          return;
        }
        const venueRes = await api.post("/organiser/venues", {
          name: newVenueName,
          city: newVenueCity
        });
        finalVenueId = venueRes.data.id;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        ...(formData.posterPath && { posterPath: formData.posterPath }),
        venueId: finalVenueId,
        startsAt: new Date(formData.startsAt).toISOString(),
        ...(formData.doorsOpenAt && { doorsOpenAt: new Date(formData.doorsOpenAt).toISOString() }),
        artists: [
          {
            artistId: formData.artistId,
            isHeadline: true
          }
        ],
        ticketTypes: ticketTypes.map(t => ({
          name: t.name,
          priceCents: Number(t.priceCents),
          quantity: Number(t.quantity),
          saleStartsAt: new Date(t.saleStartsAt || formData.startsAt).toISOString(),
          saleEndsAt: new Date(t.saleEndsAt || formData.startsAt).toISOString(),
          minPerOrder: Number(t.minPerOrder),
          maxPerOrder: Number(t.maxPerOrder)
        }))
      };

      await api.post("/organiser/events", payload);
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      let errMsg = "Failed to create event. Please check all fields.";
      if (err.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

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
          Create New Event
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Set up your event details and ticketing tiers.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Basic Details</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Summer Music Festival" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
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
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Image Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Tell your audience about the event..." rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Venue</label>
                <select name="venueId" value={formData.venueId} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
                  ))}
                  <option value="NEW">+ Create Custom Venue</option>
                </select>
                {formData.venueId === "NEW" && (
                  <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                      <input type="text" value={newVenueCity} onChange={e => setNewVenueCity(e.target.value)} placeholder="e.g. Mumbai" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Venue Name</label>
                      <input type="text" value={newVenueName} onChange={e => setNewVenueName(e.target.value)} placeholder="e.g. Jio World Centre" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Artist (Headline)</label>
                <select name="artistId" value={formData.artistId} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  {artists.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
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

        {/* Tickets */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Ticketing Tiers</h2>
            <button type="button" onClick={addTicketType} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-4 h-4" /> Add Tier
            </button>
          </div>

          <div className="space-y-6">
            {ticketTypes.map((ticket, index) => (
              <div key={index} className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 relative">
                {ticketTypes.length > 1 && (
                  <button type="button" onClick={() => removeTicketType(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Tier Name</label>
                    <input required type="text" value={ticket.name} onChange={(e) => handleTicketChange(index, "name", e.target.value)} placeholder="e.g. VIP" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Price (in cents)</label>
                    <input required type="number" value={ticket.priceCents} onChange={(e) => handleTicketChange(index, "priceCents", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Quantity</label>
                    <input required type="number" value={ticket.quantity} onChange={(e) => handleTicketChange(index, "quantity", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Sale Starts At</label>
                    <input required type="datetime-local" value={ticket.saleStartsAt} onChange={(e) => handleTicketChange(index, "saleStartsAt", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Sale Ends At</label>
                    <input required type="datetime-local" value={ticket.saleEndsAt} onChange={(e) => handleTicketChange(index, "saleEndsAt", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : <><Save className="w-5 h-5" /> Publish Event</>}
          </button>
        </div>
      </form>
    </div>
  );
}
