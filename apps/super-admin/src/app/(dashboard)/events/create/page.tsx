"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Calendar, 
  Music, 
  MapPin, 
  User, 
  Ticket, 
  UploadCloud, 
  Image as ImageIcon, 
  FileText, 
  ChevronDown, 
  GripVertical,
  ArrowRight,
  X,
  Loader2
} from "lucide-react";
import api from "@/lib/api";

export default function CreateEventPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      priceCents: 5000,
      quantity: 100,
      saleStartsAt: formData.startsAt || "",
      saleEndsAt: formData.startsAt || "",
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

      if (formData.venueId === "NEW") {
        if (!newVenueName || !newVenueCity) {
          throw new Error("Please specify the custom venue name and city.");
        }
        const venueRes = await api.post("/organiser/venues", {
          name: newVenueName,
          city: newVenueCity,
          state: "Custom",
          address: `${newVenueName}, ${newVenueCity}`
        });
        finalVenueId = venueRes.data.data.id;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        venueId: finalVenueId,
        category: formData.category,
        posterPath: formData.posterPath,
        startsAt: new Date(formData.startsAt).toISOString(),
        doorsOpenAt: formData.doorsOpenAt ? new Date(formData.doorsOpenAt).toISOString() : undefined,
        artists: formData.artistId ? [{ artistId: formData.artistId, isHeadline: true }] : [],
        ticketTypes: ticketTypes.map(t => ({
          name: t.name,
          priceCents: Number(t.priceCents),
          quantity: Number(t.quantity),
          saleStartsAt: t.saleStartsAt ? new Date(t.saleStartsAt).toISOString() : new Date().toISOString(),
          saleEndsAt: t.saleEndsAt ? new Date(t.saleEndsAt).toISOString() : new Date(formData.startsAt).toISOString(),
          minPerOrder: Number(t.minPerOrder),
          maxPerOrder: Number(t.maxPerOrder)
        }))
      };

      await api.post("/organiser/events", payload);
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to create event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-5xl pb-24 relative">
      {/* Decorative ambient glow in top-right */}
      <div className="absolute -top-12 -right-12 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header with Back Link & Decorative Script */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
        <div>
          <button 
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors mb-2.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Events
          </button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Create New Event
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Set up your event details and ticketing tiers.
          </p>
        </div>

        {/* Decorative Slogan */}
        <div className="hidden sm:block text-right select-none transform -rotate-2">
          <span className="text-slate-400/80 font-bold italic text-sm tracking-wide block font-serif">
            Great Events
          </span>
          <span className="text-slate-400 font-extrabold italic text-xs tracking-wider block font-serif -mt-0.5">
            Start Here
          </span>
          <div className="w-16 h-1 bg-amber-300/40 rounded-full ml-auto mt-0.5"></div>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 font-bold text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        
        {/* ===== CARD 1: BASIC DETAILS ===== */}
        <div className="rounded-3xl bg-white p-7 sm:p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-slate-100">
          
          {/* Section Header */}
          <div className="flex items-start gap-3.5 mb-7">
            <div className="w-11 h-11 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Basic Details</h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Tell us about your event. This will help attendees discover and know your event better.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            
            {/* Row 1: Event Title & Poster Image */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    required 
                    type="text" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange} 
                    placeholder="e.g. Summer Music Festival" 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                </div>
              </div>

              {/* Poster Image Upload Box */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Poster Image <span className="text-slate-400 font-medium">(Required)</span> <span className="text-red-500">*</span>
                </label>
                <div className="rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/40 p-3.5 flex flex-col justify-center relative hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full px-2 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center text-slate-400 shadow-2xs shrink-0">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <input 
                        ref={fileInputRef}
                        required={!formData.posterPath} 
                        type="file" 
                        accept="image/jpeg, image/png, image/webp, image/avif" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const localUrl = URL.createObjectURL(file);
                          setPreviewUrl(localUrl);
                          setIsUploadingImage(true);

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
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }}
                        className="text-xs text-slate-500 font-medium file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-200/80 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer min-w-0 truncate"
                      />
                    </div>

                    {/* Preview Thumbnail and Cross (Remove) Icon */}
                    {(previewUrl || formData.posterPath) ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={previewUrl || formData.posterPath} 
                            alt="Selected poster" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                            setPreviewUrl("");
                            setFormData(prev => ({ ...prev, posterPath: "" }));
                          }}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remove image"
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-300 hidden sm:block shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-[10px] font-semibold text-slate-400 mt-2 text-center">
                    Supported formats: JPG, PNG, WEBP, AVIF
                  </p>

                  {isUploadingImage && (
                    <div className="mt-1 text-[11px] font-bold text-amber-600 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image...
                    </div>
                  )}

                  {!isUploadingImage && formData.posterPath && (
                    <div className="mt-1 text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Image Uploaded Successfully
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">
                  Description <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <textarea 
                  required 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  maxLength={1000}
                  placeholder="Tell your audience about the event..." 
                  rows={4} 
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all resize-none" 
                />
                <span className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400 pointer-events-none">
                  {formData.description.length}/1000
                </span>
              </div>
            </div>

            {/* Row 3: Category & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-9 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Concert">Concert</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Festival">Festival</option>
                    <option value="Theatre">Theatre</option>
                    <option value="Sports">Sports</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select 
                    name="venueId" 
                    value={formData.venueId} 
                    onChange={handleChange} 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-9 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all appearance-none cursor-pointer"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
                    ))}
                    <option value="NEW">+ Create Custom Venue</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {formData.venueId === "NEW" && (
                  <div className="mt-3.5 grid grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                      <input type="text" value={newVenueCity} onChange={e => setNewVenueCity(e.target.value)} placeholder="e.g. Mumbai" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Venue Name</label>
                      <input type="text" value={newVenueName} onChange={e => setNewVenueName(e.target.value)} placeholder="e.g. Jio World Centre" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400" required />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Artist & Starts At */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Artist */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Artist (Headline) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select 
                    name="artistId" 
                    value={formData.artistId} 
                    onChange={handleChange} 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-9 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all appearance-none cursor-pointer"
                  >
                    {artists.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Starts At */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Starts At <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    required 
                    type="datetime-local" 
                    name="startsAt" 
                    value={formData.startsAt} 
                    onChange={handleChange} 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-4 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 5: Doors Open At */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Doors Open At <span className="text-slate-400 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    name="doorsOpenAt" 
                    value={formData.doorsOpenAt} 
                    onChange={handleChange} 
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3 pl-4 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===== CARD 2: TICKETING TIERS ===== */}
        <div className="rounded-3xl bg-white p-7 sm:p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-slate-100">
          
          {/* Section Header */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50/90 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">Ticketing Tiers</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Add different ticket tiers for your event. You can create multiple price levels, types, and quantities.
                </p>
              </div>
            </div>

            {/* Add Tier Button */}
            <button 
              type="button" 
              onClick={addTicketType} 
              className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 bg-[#FFF9EB] hover:bg-amber-100/70 border border-amber-200/80 px-4 py-2.5 rounded-2xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-3" /> Add Tier
            </button>
          </div>

          {/* Tiers List */}
          <div className="space-y-5">
            {ticketTypes.map((ticket, index) => (
              <div 
                key={index} 
                className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-white relative space-y-4"
              >
                {/* Top Row: Number, Name, Price, Quantity, Delete */}
                <div className="flex items-center gap-3.5">
                  
                  {/* Grip + Number Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <span className="w-6 h-6 rounded-full bg-amber-100/90 border border-amber-200/70 text-amber-950 font-black text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                    
                    {/* Tier Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Tier Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="text" 
                        value={ticket.name} 
                        onChange={(e) => handleTicketChange(index, "name", e.target.value)} 
                        placeholder="General Admission" 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                    </div>

                    {/* Price in cents */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Price (in cents) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="number" 
                        value={ticket.priceCents} 
                        onChange={(e) => handleTicketChange(index, "priceCents", e.target.value)} 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="number" 
                        value={ticket.quantity} 
                        onChange={(e) => handleTicketChange(index, "quantity", e.target.value)} 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                    </div>

                  </div>

                  {/* Delete Button */}
                  {ticketTypes.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeTicketType(index)} 
                      className="w-8 h-8 rounded-xl bg-red-50/80 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors shrink-0 self-end mb-1 cursor-pointer"
                      title="Delete tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Bottom Row: Sale Starts & Ends Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:pl-11">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Sale Starts At <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        required 
                        type="datetime-local" 
                        value={ticket.saleStartsAt} 
                        onChange={(e) => handleTicketChange(index, "saleStartsAt", e.target.value)} 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Sale Ends At <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        required 
                        type="datetime-local" 
                        value={ticket.saleEndsAt} 
                        onChange={(e) => handleTicketChange(index, "saleEndsAt", e.target.value)} 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* ===== BOTTOM ACTION BUTTON ===== */}
        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-9 py-4 text-xs font-black text-slate-950 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              "Publishing Event..."
            ) : (
              <>
                <FileText className="w-4 h-4 stroke-[2.5]" />
                <span>Publish Event</span>
                <ArrowRight className="w-4 h-4 ml-0.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
