"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Music,
  MapPin,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  GripVertical,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/lib/useCategories";
import SeatingBuilder from "@/components/SeatingBuilder";
import {
  type SeatingMode,
  type SeatSection,
  type SeatingTemplate,
  capacityByTier,
  renameTierInSections,
  removeTierFromSections,
  healSections,
  toApiConfig,
  validateSeating,
} from "@/lib/seating";

export default function CreateEventPage() {
  const router = useRouter();
  const { categories, loading: categoriesLoading } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [seatingMode, setSeatingMode] = useState<SeatingMode>("GENERAL");
  const [seatSections, setSeatSections] = useState<SeatSection[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    venueName: "",
    venueCity: "",
    posterPath: "",
    startsAt: "",
    doorsOpenAt: "",
  });

  const [ticketTypes, setTicketTypes] = useState([
    {
      name: "General Admission",
      description: "",
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

  // Last non-empty name of each ticket category (by position). The seat map refers to
  // categories by name, so while a name is being retyped (and is briefly empty) we keep
  // the seat map on the old name and move it to the new one as soon as it's non-empty.
  const tierLinkNames = useRef<string[]>([]);

  const handleTicketChange = (index: number, field: string, value: any) => {
    const updated = [...ticketTypes];
    const currentName = updated[index].name;
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
    if (field !== "name") return;
    const linkName = tierLinkNames.current[index] || currentName;
    const newName = String(value);
    if (!newName.trim()) {
      tierLinkNames.current[index] = linkName; // remember what the seat map points at
      return;
    }
    if (linkName.trim() && linkName !== newName) {
      setSeatSections((prev) => renameTierInSections(prev, linkName, newName));
    }
    tierLinkNames.current[index] = newName;
  };

  // Sections never point at a missing category (falls back to the first one)
  const healedSections = healSections(seatSections, ticketTypes.map((t) => t.name));

  // Seated / standing categories get their quantity from the seat map
  const mapCapacity = seatingMode === "GENERAL" ? new Map<string, number>() : capacityByTier(healedSections);
  const mappedQuantity = (name: string) => mapCapacity.get(name.trim().toLowerCase());

  const emptyTier = (name: string, priceCents = 5000) => ({
    name,
    description: "",
    priceCents,
    quantity: 100,
    saleStartsAt: "",
    saleEndsAt: "",
    minPerOrder: 1,
    maxPerOrder: 10
  });

  /** Adds a ticket category with a unique name and returns that name. */
  const addTierNamed = (suggested: string, priceCents = 5000) => {
    const taken = new Set(ticketTypes.map((t) => t.name.trim().toLowerCase()));
    let name = suggested.trim() || "New Category";
    let n = 2;
    while (taken.has(name.toLowerCase())) name = `${suggested.trim() || "New Category"} ${n++}`;
    setTicketTypes((prev) => [...prev, emptyTier(name, priceCents)]);
    return name;
  };

  /** Creates the categories a template needs; replaces the untouched default category. */
  const applyTemplateTiers = (tpl: SeatingTemplate) => {
    setTicketTypes((prev) => {
      const isUntouchedDefault =
        prev.length === 1 && prev[0].name === "General Admission" && !prev[0].description && Number(prev[0].priceCents) === 5000;
      const base = isUntouchedDefault ? [] : prev;
      if (isUntouchedDefault) tierLinkNames.current = [];
      const have = new Set(base.map((t) => t.name.trim().toLowerCase()));
      const added = tpl.tiers.filter((t) => !have.has(t.name.toLowerCase())).map((t) => emptyTier(t.name, t.priceCents));
      return [...base, ...added];
    });
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, emptyTier("")]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length === 1) return;
    const removedName = tierLinkNames.current[index] || ticketTypes[index].name;
    const updated = [...ticketTypes];
    updated.splice(index, 1);
    tierLinkNames.current.splice(index, 1);
    setTicketTypes(updated);
    // Seats that used the deleted category fall back to the first remaining one
    setSeatSections((prev) => removeTierFromSections(prev, removedName, updated[0]?.name || ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!formData.category.trim()) {
        throw new Error("Please select a category.");
      }
      if (!formData.venueName.trim() || !formData.venueCity.trim()) {
        throw new Error("Please specify the venue name and city.");
      }
      const tierNames = ticketTypes.map((t) => t.name.trim());
      if (new Set(tierNames.map((n) => n.toLowerCase())).size !== tierNames.length) {
        throw new Error("Each ticket category needs a different name.");
      }
      const seatingProblems = validateSeating(seatingMode, healedSections, tierNames);
      if (seatingProblems.length > 0) {
        throw new Error(seatingProblems[0]);
      }

      // Automatically create and register the custom venue
      const venueRes = await api.post("/organiser/venues", {
        name: formData.venueName.trim(),
        city: formData.venueCity.trim(),
        state: formData.venueCity.trim() || "Custom",
        address: `${formData.venueName.trim()}, ${formData.venueCity.trim()}`
      });
      const finalVenueId = venueRes.data?.data?.id || venueRes.data?.id;
      if (!finalVenueId) {
        throw new Error("Failed to register venue. Please try again.");
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        venueId: finalVenueId,
        category: formData.category.trim(),
        posterPath: formData.posterPath,
        seatingType: seatingMode === "GENERAL" ? "GENERAL" : "RESERVED",
        seatingConfig: toApiConfig(seatingMode, healedSections),
        startsAt: new Date(formData.startsAt).toISOString(),
        doorsOpenAt: formData.doorsOpenAt ? new Date(formData.doorsOpenAt).toISOString() : undefined,
        artists: [],
        ticketTypes: ticketTypes.map(t => ({
          name: t.name,
          description: t.description || undefined,
          priceCents: Number(t.priceCents),
          quantity: mappedQuantity(t.name) ?? Number(t.quantity),
          saleStartsAt: t.saleStartsAt && new Date(t.saleStartsAt) < new Date(formData.startsAt) ? new Date(t.saleStartsAt).toISOString() : new Date().toISOString(),
          saleEndsAt: t.saleEndsAt && new Date(t.saleEndsAt) > new Date() ? new Date(t.saleEndsAt).toISOString() : new Date(formData.startsAt).toISOString(),
          minPerOrder: Number(t.minPerOrder || 1),
          maxPerOrder: Number(t.maxPerOrder || 10)
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
    <div className=" max-w-5xl pb-24 relative">

      {/* Top Header with Back Link & Decorative Script */}
      <header className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
        <div>
          <button 
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-2.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Events
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create event
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add the details, seating and tickets, then publish.
          </p>
        </div>

      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-600 font-semibold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        
        {/* ===== CARD 1: BASIC DETAILS ===== */}
        <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs border border-slate-200/80">
          
          {/* Section Header */}
          <div className="flex items-start gap-3.5 mb-7">
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">Basic Details</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Tell us about your event. This will help attendees discover and know your event better.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            
            {/* Row 1: Event Title & Poster Image */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Event Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
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
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                </div>
              </div>

              {/* Poster Image Upload Box */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Poster Image <span className="text-slate-400 font-medium">(Required)</span> <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl border-2 border-dashed border-slate-200/90 bg-slate-50/40 p-3.5 flex flex-col justify-center relative hover:bg-slate-50 transition-colors">
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
                            const url = res.data?.data?.url || res.data?.url;
                            setFormData(prev => ({ ...prev, posterPath: url }));
                          } catch (err) {
                            console.error("Failed to upload image", err);
                            alert("Failed to upload image.");
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }}
                        className="text-sm text-slate-500 font-medium file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[13px] file:font-semibold file:bg-slate-200/80 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer min-w-0 truncate"
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
                  
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Supported formats: JPG, PNG, WEBP, AVIF
                  </p>

                  {isUploadingImage && (
                    <div className="mt-1 text-[13px] font-semibold text-amber-600 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image...
                    </div>
                  )}

                  {!isUploadingImage && formData.posterPath && (
                    <div className="mt-1 text-[13px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Image Uploaded Successfully
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-800">
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
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all resize-none" 
                />
                <span className="absolute bottom-3 right-4 text-xs text-slate-500 pointer-events-none">
                  {formData.description.length}/1000
                </span>
              </div>
            </div>

            {/* Row 3: Category & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    required
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={categoriesLoading}
                    className={`w-full appearance-none rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-10 text-sm font-semibold outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all cursor-pointer disabled:cursor-wait ${formData.category ? "text-slate-900" : "text-slate-400"}`}
                  >
                    <option value="" disabled>
                      {categoriesLoading ? "Loading categories…" : "Select a category"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="text-slate-900">{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {!categoriesLoading && categories.length === 0 && (
                  <p className="mt-1.5 text-[13px] font-medium text-red-500">
                    No categories available. An admin needs to add them on the Categories page.
                  </p>
                )}
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      required
                      type="text" 
                      name="venueName" 
                      value={formData.venueName} 
                      onChange={handleChange} 
                      placeholder="Venue Name (e.g. Arena)"
                      className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      name="venueCity" 
                      value={formData.venueCity} 
                      onChange={handleChange} 
                      placeholder="City (e.g. Sydney)"
                      className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Dates & Times (Starts At & Doors Open At) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Starts At */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Starts At <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    required 
                    type="datetime-local" 
                    name="startsAt" 
                    value={formData.startsAt} 
                    onChange={handleChange} 
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-4 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Doors Open At */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Doors Open At <span className="text-slate-400 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    name="doorsOpenAt" 
                    value={formData.doorsOpenAt} 
                    onChange={handleChange} 
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 pl-4 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all" 
                  />
                  <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===== CARD 2: SEATING & LAYOUT ===== */}
        <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs border border-slate-200/80">
          <div className="flex items-start gap-3.5 mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">Seating & Layout</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Choose how people attend. For seats or tables, build the map and we count the tickets for you.
              </p>
            </div>
          </div>
          <SeatingBuilder
            mode={seatingMode}
            onModeChange={setSeatingMode}
            sections={healedSections}
            onSectionsChange={setSeatSections}
            tiers={ticketTypes}
            onTierChange={handleTicketChange}
            onAddTier={addTierNamed}
            onRemoveTier={removeTicketType}
            onApplyTemplate={applyTemplateTiers}
          />
        </div>

        {/* ===== CARD 3: TICKET CATEGORIES (open / standing events only; seated events set them on the seat map) ===== */}
        {seatingMode === "GENERAL" && (
        <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs border border-slate-200/80">
          
          {/* Section Header */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-start gap-3.5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 leading-tight">Ticket Categories</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Set a name, price and number of tickets for each category (e.g. VIP, Standard, Student).
                </p>
              </div>
            </div>

            {/* Add Category Button */}
            <button 
              type="button" 
              onClick={addTicketType} 
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 text-sm font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-3" /> Add Category
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-5">
            {ticketTypes.map((ticket, index) => (
              <div 
                key={index} 
                className="p-5 sm:p-6 rounded-xl border border-slate-200/80 bg-white relative space-y-4"
              >
                {/* Top Row: Number, Name, Price, Quantity, Delete */}
                <div className="flex items-center gap-3.5">
                  
                  {/* Grip + Number Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <span className="w-6 h-6 rounded-full bg-amber-100/90 border border-amber-200/70 text-amber-950 font-semibold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                    
                    {/* Category Name */}
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Category Name (e.g. VIP) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="text" 
                        value={ticket.name} 
                        onChange={(e) => handleTicketChange(index, "name", e.target.value)} 
                        placeholder="e.g. VIP or Normal" 
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                    </div>

                    {/* Price in cents */}
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Price ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number(ticket.priceCents) / 100}
                        onChange={(e) => handleTicketChange(index, "priceCents", Math.round(Number(e.target.value || 0) * 100))}  
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Total Tickets <span className="text-red-500">*</span>
                        {mappedQuantity(ticket.name) !== undefined && (
                          <span className="ml-1 text-amber-700 font-semibold">· from seat map</span>
                        )}
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        disabled={mappedQuantity(ticket.name) !== undefined}
                        value={mappedQuantity(ticket.name) ?? ticket.quantity}
                        onChange={(e) => handleTicketChange(index, "quantity", e.target.value)}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white disabled:bg-amber-50/60 disabled:text-amber-900"
                      />
                    </div>

                  </div>

                  {/* Delete Button */}
                  {ticketTypes.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeTicketType(index)} 
                      className="w-8 h-8 rounded-xl bg-red-50/80 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors shrink-0 self-end mb-1 cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Description Row */}
                <div className="pl-0 lg:pl-11">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Category Perks <span className="text-slate-400 font-medium">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={ticket.description} 
                    onChange={(e) => handleTicketChange(index, "description", e.target.value)} 
                    placeholder="e.g. Includes front row seating and a free drink" 
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/40 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" 
                  />
                </div>
              </div>
            ))}
          </div>

        </div>
        )}

        {/* ===== BOTTOM ACTION BUTTON ===== */}
        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-9 py-4 text-sm font-semibold text-slate-950 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
