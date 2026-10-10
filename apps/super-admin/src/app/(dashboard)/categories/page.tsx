"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, LayoutGrid, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/admin/categories");
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post("/admin/categories", { name: newCat.trim() });
      setNewCat("");
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to add category. It might already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete category.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage the event categories available for organisers on the platform.
        </p>
      </div>

      {/* Add New Category */}
      <div className="mb-12">
        <form onSubmit={handleAdd} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              placeholder="Add new category (e.g. Comedy)"
              className="w-full bg-transparent border-b-2 border-slate-200 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 transition-colors"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isSubmitting || !newCat.trim()}
            className="h-10 px-6 rounded-full bg-[#F6C636] hover:bg-[#E5B523] text-slate-950 text-sm font-extrabold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Category"}
          </button>
        </form>
      </div>

      {/* Category List */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          All Categories ({categories.length})
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl text-center">
            No categories have been added yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className="group flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/30 transition-colors"
              >
                <span className="text-sm font-bold text-slate-700 group-hover:text-amber-900">
                  {cat.name}
                </span>
                
                <button 
                  onClick={() => handleDelete(cat.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
