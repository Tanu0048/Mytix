"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { 
  MapPin, 
  Plus, 
  Search, 
  Building2, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  Users,
  Image as ImageIcon
} from "lucide-react";

interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  capacity: number;
  timezone: string;
  createdAt: string;
  _count?: {
    events: number;
  };
}

const AUSTRALIAN_STATES = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA", name: "Western Australia" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT", name: "Northern Territory" },
];

const DEFAULT_CITY_IMAGE = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80';

export default function VenuesAndCitiesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // City Images State
  const [cityImages, setCityImages] = useState<Record<string, string>>({});
  const [cityImageUrl, setCityImageUrl] = useState("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [selectedCityForImage, setSelectedCityForImage] = useState<string>("Melbourne");
  const [cityImageEditVal, setCityImageEditVal] = useState("");
  const [isSavingCityImg, setIsSavingCityImg] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "NSW",
    address: "",
    capacity: 1000,
    timezone: "Australia/Sydney"
  });

  const loadVenues = async () => {
    setIsLoading(true);
    try {
      const [venuesRes, cityImagesRes] = await Promise.all([
        api.get("/venues"),
        api.get("/admin/city-images").catch(() => ({ data: { data: {} } }))
      ]);
      setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
      if (cityImagesRes.data?.data && typeof cityImagesRes.data.data === "object") {
        setCityImages(cityImagesRes.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load venues.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const openCreateModal = () => {
    setEditingVenue(null);
    setCityImageUrl("");
    setFormData({
      name: "",
      city: "",
      state: "NSW",
      address: "",
      capacity: 1000,
      timezone: "Australia/Sydney"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue);
    const cityKey = (venue.city || "").toLowerCase().trim();
    setCityImageUrl(cityImages[cityKey] || "");
    setFormData({
      name: venue.name,
      city: venue.city,
      state: venue.state || "NSW",
      address: venue.address || "",
      capacity: venue.capacity || 1000,
      timezone: venue.timezone || "Australia/Sydney"
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVenue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (editingVenue) {
        // Update Venue
        await api.patch(`/organiser/venues/${editingVenue.id}`, formData);
        setSuccessMsg(`Venue '${formData.name}' updated successfully!`);
      } else {
        // Create Venue & City
        await api.post("/organiser/venues", formData);
        setSuccessMsg(`City & Venue '${formData.name} (${formData.city})' created successfully!`);
      }

      // Update city image if specified
      if (formData.city.trim()) {
        const cityKey = formData.city.toLowerCase().trim();
        const updatedCityImages = { ...cityImages, [cityKey]: cityImageUrl.trim() };
        try {
          await api.put("/admin/city-images", updatedCityImages);
          setCityImages(updatedCityImages);
        } catch (imgErr) {
          console.warn("Could not save city image:", imgErr);
        }
      }

      closeModal();
      await loadVenues();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to save venue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCityImageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCityForImage) return;

    setIsSavingCityImg(true);
    try {
      const cityKey = selectedCityForImage.toLowerCase().trim();
      const updated = { ...cityImages, [cityKey]: cityImageEditVal.trim() };
      await api.put("/admin/city-images", updated);
      setCityImages(updated);
      setSuccessMsg(`Cover photo for city '${selectedCityForImage}' updated!`);
      setIsCityModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save city cover photo.");
    } finally {
      setIsSavingCityImg(false);
    }
  };


  const handleDelete = async (venue: Venue) => {
    const eventsCount = venue._count?.events || 0;
    if (eventsCount > 0) {
      alert(`Cannot delete '${venue.name}' because ${eventsCount} event(s) are hosted at this venue.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete venue '${venue.name}' in '${venue.city}'?`)) {
      return;
    }

    try {
      await api.delete(`/organiser/venues/${venue.id}`);
      setSuccessMsg(`Venue '${venue.name}' deleted.`);
      await loadVenues();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete venue.");
    }
  };

  // Unique cities list for filtering
  const uniqueCities = useMemo(() => {
    const citiesSet = new Set(venues.map(v => v.city.trim()).filter(Boolean));
    return Array.from(citiesSet).sort();
  }, [venues]);

  // Filtered venues list
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.address && v.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCity = 
        selectedCityFilter === "ALL" || 
        v.city.toLowerCase() === selectedCityFilter.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [venues, searchQuery, selectedCityFilter]);

  const totalEventsCount = venues.reduce((sum, v) => sum + (v._count?.events || 0), 0);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-amber-500" />
            Venues & Cities
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Manage concert cities and venue locations for Australian tours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const initialCity = uniqueCities[0] || "Melbourne";
              setSelectedCityForImage(initialCity);
              setCityImageEditVal(cityImages[initialCity.toLowerCase().trim()] || "");
              setIsCityModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 transition-all shadow-2xs cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>City Cover Photos</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#F6C636] hover:bg-[#E5B523] px-5 py-3 text-sm font-black text-slate-950 transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-3" /> Add City & Venue
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /> {error}
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Cities</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{uniqueCities.length}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-3">
            Available on website location filters
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Venues</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{venues.length}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-3">
            Stadiums, arenas, and halls configured
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live & Past Shows</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalEventsCount}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-3">
            Concerts tied to these locations
          </p>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        
        {/* Controls: Search + City Filter Tabs */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search by venue name, city, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* City Quick Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCityFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCityFilter === "ALL"
                  ? "bg-slate-950 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              All Cities ({venues.length})
            </button>
            {uniqueCities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCityFilter(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCityFilter.toLowerCase() === city.toLowerCase()
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Venues Table */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 font-semibold">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading venues and cities...
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">No venues or cities found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your concert venues and cities so organisers can host events and fans can filter shows by location.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-[#F6C636] hover:bg-[#E5B523] text-slate-950 rounded-xl text-xs font-black transition-colors"
            >
              + Add First Venue
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">Venue Name</th>
                  <th className="py-4 px-6">City & State</th>
                  <th className="py-4 px-6">Address</th>
                  <th className="py-4 px-6">Capacity</th>
                  <th className="py-4 px-6 text-center">Events Hosted</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVenues.map((venue) => {
                  const eventsCount = venue._count?.events || 0;

                  return (
                    <tr key={venue.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{venue.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{venue.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* City & State */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{venue.city}</span>
                          <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                            {venue.state || "AU"}
                          </span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-4 px-6 text-slate-600 text-xs font-medium max-w-xs truncate">
                        {venue.address || "TBD"}
                      </td>

                      {/* Capacity */}
                      <td className="py-4 px-6 text-slate-900 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {venue.capacity ? venue.capacity.toLocaleString() : "TBD"}
                        </span>
                      </td>

                      {/* Events Count */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          eventsCount > 0 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {eventsCount} show{eventsCount === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(venue)}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Venue"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(venue)}
                            className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Venue"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {editingVenue ? "Edit Venue & Location" : "Add City & Venue"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Venues added here will be available when creating concerts.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    City Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Sydney or Melbourne"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Australian State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
                  >
                    {AUSTRALIAN_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Venue Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sydney Opera House or Marvel Stadium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bennelong Point, Sydney NSW 2000"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Capacity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
                  >
                    <option value="Australia/Sydney">Sydney / Melbourne (AEST)</option>
                    <option value="Australia/Brisbane">Brisbane (AEST no DST)</option>
                    <option value="Australia/Adelaide">Adelaide (ACST)</option>
                    <option value="Australia/Perth">Perth (AWST)</option>
                    <option value="Australia/Darwin">Darwin (ACST)</option>
                  </select>
                </div>
              </div>

              {/* City Cover Photo Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>City Cover Photo (Browse by City)</span>
                  <span className="text-[11px] font-semibold text-slate-400">Optional</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... (leave blank for default image)"
                    value={cityImageUrl}
                    onChange={(e) => setCityImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                  {cityImageUrl && (
                    <button
                      type="button"
                      onClick={() => setCityImageUrl("")}
                      className="px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      title="Clear image"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown on user website under &quot;Browse by city&quot;. If left empty, Mytix default image is used.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#F6C636] hover:bg-[#E5B523] text-slate-950 text-xs font-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingVenue ? "Update Venue" : "Save City & Venue"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: MANAGE CITY COVER PHOTOS ===== */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-500" />
                  City Cover Photos
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Customize the photo for each destination in &quot;Browse by city&quot;.
                </p>
              </div>
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCityImageModal} className="p-6 space-y-5">
              
              {/* Select City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Australian City
                </label>
                <select
                  value={selectedCityForImage}
                  onChange={(e) => {
                    const c = e.target.value;
                    setSelectedCityForImage(c);
                    setCityImageEditVal(cityImages[c.toLowerCase().trim()] || "");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
                >
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>
                      {c} {cityImages[c.toLowerCase().trim()] ? "✓ (Custom Photo)" : "(Default Photo)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Cover Photo URL</span>
                  {cityImageEditVal && (
                    <button
                      type="button"
                      onClick={() => setCityImageEditVal("")}
                      className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      Revert to Default
                    </button>
                  )}
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... (or leave blank for default image)"
                  value={cityImageEditVal}
                  onChange={(e) => setCityImageEditVal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              {/* Live Preview Card (Dark Theme matching user site) */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Live Card Preview (User Website)
                </span>
                <div className="relative overflow-hidden rounded-2xl h-36 flex flex-col justify-between p-4 border border-slate-700 shadow-md">
                  {/* Background Image */}
                  <img
                    src={cityImageEditVal.trim() || DEFAULT_CITY_IMAGE}
                    alt={selectedCityForImage}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20" />

                  {/* Top Badge */}
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Shows
                    </span>
                  </div>

                  {/* Bottom Text */}
                  <div className="relative z-10">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                      Australia
                    </p>
                    <h4 className="font-black text-white text-xl tracking-tight leading-tight">
                      {selectedCityForImage}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCityModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCityImg}
                  className="px-6 py-2.5 rounded-xl bg-[#F6C636] hover:bg-[#E5B523] text-slate-950 text-xs font-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingCityImg ? "Saving..." : "Save City Photo"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
