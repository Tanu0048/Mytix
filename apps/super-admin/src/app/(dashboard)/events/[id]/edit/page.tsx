"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Ticket, Armchair } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/lib/useCategories";
import SeatingBuilder from "@/components/SeatingBuilder";
import {
  type SeatingMode,
  type SeatSection,
  type SeatingTemplate,
  capacityByTier,
  fromApiConfig,
  renameTierInSections,
  removeTierFromSections,
  healSections,
  toApiConfig,
  validateSeating,
} from "@/lib/seating";

function EditEventForm() {
  const router = useRouter();
  const { categories, loading: categoriesLoading } = useCategories();
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

  // Seat map
  const [seatingMode, setSeatingMode] = useState<SeatingMode>("GENERAL");
  const [seatSections, setSeatSections] = useState<SeatSection[]>([]);
  const [seatingTouched, setSeatingTouched] = useState(false);
  const [legacyRows, setLegacyRows] = useState(false);

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

        const seating = fromApiConfig(data.seatingType, data.seatingConfig);
        setSeatingMode(seating.mode);
        setSeatSections(seating.sections);
        setLegacyRows(seating.customRows);

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

  // Last non-empty name of each ticket category (by position). The seat map refers to
  // categories by name, so while a name is being retyped (and is briefly empty) we keep
  // the seat map on the old name and move it to the new one as soon as it's non-empty.
  const tierLinkNames = useRef<string[]>([]);

  const handleTicketChange = (index: number, field: string, value: any) => {
    const updated = [...ticketTypes];
    const currentName: string = updated[index].name || "";
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

  const anySold = ticketTypes.some((t) => (t.sold || 0) > 0);
  const seatingLocked = anySold || legacyRows;
  const seatingLockReason = anySold
    ? "Tickets have already been sold, so the seat layout is locked to protect existing bookings. You can still change names and prices."
    : "This event uses custom row names from an older version of the seat builder, so the layout is shown read-only.";

  // Seated / standing categories get their quantity from the seat map
  // Sections never point at a missing category (falls back to the first one)
  const healedSections = healSections(seatSections, ticketTypes.map((t) => String(t.name || "")));
  const mapCapacity = seatingMode === "GENERAL" ? new Map<string, number>() : capacityByTier(healedSections);
  const mappedQuantity = (name: string) => mapCapacity.get(String(name || "").trim().toLowerCase());

  const newTier = (name: string, priceCents = 5000) => ({
    name,
    priceCents,
    quantity: 100,
    sold: 0,
    available: 100,
    saleStartsAt: "",
    saleEndsAt: "",
    minPerOrder: 1,
    maxPerOrder: 10
  });

  const addTierNamed = (suggested: string, priceCents = 5000) => {
    const taken = new Set(ticketTypes.map((t) => String(t.name || "").trim().toLowerCase()));
    let name = suggested.trim() || "New Category";
    let n = 2;
    while (taken.has(name.toLowerCase())) name = `${suggested.trim() || "New Category"} ${n++}`;
    setTicketTypes((prev) => [...prev, newTier(name, priceCents)]);
    return name;
  };

  const applyTemplateTiers = (tpl: SeatingTemplate) => {
    setTicketTypes((prev) => {
      const have = new Set(prev.map((t) => String(t.name || "").trim().toLowerCase()));
      return [...prev, ...tpl.tiers.filter((t) => !have.has(t.name.toLowerCase())).map((t) => newTier(t.name, t.priceCents))];
    });
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, newTier("")]);
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
    const removedName = tierLinkNames.current[index] || tier.name || "";
    const updated = [...ticketTypes];
    updated.splice(index, 1);
    tierLinkNames.current.splice(index, 1);
    setTicketTypes(updated);
    // Seats that used the deleted category fall back to the first remaining one
    if (seatSections.length > 0) {
      setSeatSections((prev) => removeTierFromSections(prev, removedName, updated[0]?.name || ""));
      setSeatingTouched(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const tierNames = ticketTypes.map((t) => String(t.name || "").trim());
      if (new Set(tierNames.map((n) => n.toLowerCase())).size !== tierNames.length) {
        throw new Error("Each ticket category needs a different name.");
      }
      const sendSeating = seatingTouched && !seatingLocked;
      if (sendSeating) {
        const savedTierNames = ticketTypes.filter((t) => t.id).map((t) => String(t.name || ""));
        const problems = validateSeating(seatingMode, healedSections, tierNames, savedTierNames);
        if (problems.length > 0) throw new Error(problems[0]);
      }

      const eventStartsIso = formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined;
      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        ...(formData.posterPath && { posterPath: formData.posterPath }),
        ...(eventStartsIso && { startsAt: eventStartsIso }),
        ...(formData.doorsOpenAt && { doorsOpenAt: new Date(formData.doorsOpenAt).toISOString() }),
        ...(sendSeating && {
          seatingType: seatingMode === "GENERAL" ? "GENERAL" : "RESERVED",
          seatingConfig: toApiConfig(seatingMode, healedSections),
        }),
        ticketTypes: ticketTypes.map((t) => ({
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          priceCents: Number(t.priceCents),
          quantity: Math.max(1, mappedQuantity(t.name) ?? Number(t.quantity)),
          saleStartsAt: t.saleStartsAt && eventStartsIso && new Date(t.saleStartsAt) < new Date(eventStartsIso) 
            ? new Date(t.saleStartsAt).toISOString() 
            : new Date().toISOString(),
          saleEndsAt: eventStartsIso || (t.saleEndsAt ? new Date(t.saleEndsAt).toISOString() : undefined),
          minPerOrder: Number(t.minPerOrder || 1),
          maxPerOrder: Number(t.maxPerOrder || 10)
        }))
      };

      await api.patch(`/organiser/events/${eventId}`, payload);
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to update event.");
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
    <div className=" max-w-4xl pb-20">
      <header className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit Event
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Update details, seating and tickets.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details Card */}
        <div className="rounded-xl bg-white p-8 shadow-xs border border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-3">Basic Details</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Event Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Poster Image</label>
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
                    <div className="text-[13px] font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Poster Image Attached
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <select required name="category" value={formData.category} onChange={handleChange} disabled={categoriesLoading} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white cursor-pointer disabled:cursor-wait">
                  <option value="" disabled>{categoriesLoading ? "Loading categories…" : "Select a category"}</option>
                  {/* Keep an older category that has since been removed, so saving doesn't silently change it */}
                  {formData.category && !categories.includes(formData.category) && (
                    <option value={formData.category}>{formData.category} (no longer listed)</option>
                  )}
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Starts At</label>
                <input required type="datetime-local" name="startsAt" value={formData.startsAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Doors Open At (Optional)</label>
                <input type="datetime-local" name="doorsOpenAt" value={formData.doorsOpenAt} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Seating & Layout Card */}
        <div className="rounded-xl bg-white p-8 shadow-xs border border-slate-200/80">
          <div className="flex items-start gap-3 mb-6 border-b border-slate-100 pb-4">
            <Armchair className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Seating & Layout</h2>
              <p className="text-sm text-slate-500 mt-0.5">How people attend, and the seat map for seated events.</p>
            </div>
          </div>
          <SeatingBuilder
            mode={seatingMode}
            onModeChange={(m) => {
              setSeatingMode(m);
              setSeatingTouched(true);
            }}
            sections={healedSections}
            onSectionsChange={(next) => {
              setSeatSections(next);
              setSeatingTouched(true);
            }}
            tiers={ticketTypes.map((t) => ({ ...t, removable: !t.id }))}
            onTierChange={handleTicketChange}
            onAddTier={addTierNamed}
            onRemoveTier={removeTicketType}
            onApplyTemplate={applyTemplateTiers}
            locked={seatingLocked}
            lockedReason={seatingLockReason}
          />
        </div>

        {/* Ticketing Tiers Card (open / standing events only; seated events edit categories on the seat map) */}
        {seatingMode === "GENERAL" && (
        <div className="rounded-xl bg-white p-8 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Ticketing Tiers</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage ticket types, pricing, and available seat inventory.</p>
            </div>
            <button 
              type="button" 
              onClick={addTicketType} 
              className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-2 rounded-xl transition-colors border border-amber-200/60"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add Tier
            </button>
          </div>

          <div className="space-y-6">
            {ticketTypes.map((ticket, index) => (
              <div key={ticket.id || index} className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 relative">
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
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200/60 rounded-full text-[13px] font-semibold text-blue-700">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{ticket.sold} tickets already sold • {ticket.available} remaining</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tier Name</label>
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
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Price ($)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number(ticket.priceCents) / 100}
                      onChange={(e) => handleTicketChange(index, "priceCents", Math.round(Number(e.target.value || 0) * 100))}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Total Quantity
                      {mappedQuantity(ticket.name) !== undefined && <span className="ml-1 text-[13px] text-amber-700">· from seat map</span>}
                    </label>
                    <input
                      required
                      type="number"
                      min={ticket.sold || 1}
                      disabled={mappedQuantity(ticket.name) !== undefined}
                      value={mappedQuantity(ticket.name) ?? ticket.quantity}
                      onChange={(e) => handleTicketChange(index, "quantity", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 disabled:bg-amber-50/60 disabled:text-amber-900"
                    />
                    {ticket.sold > 0 && (
                      <span className="text-xs text-slate-400 mt-1 block">Min {ticket.sold} (already sold)</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-8 py-3.5 text-sm font-semibold text-slate-950 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
