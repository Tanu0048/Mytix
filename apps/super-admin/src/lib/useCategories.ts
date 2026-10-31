"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

/**
 * Event categories managed by admins on the Categories page.
 * Uses the public catalog endpoint so organisers can read the list too.
 */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/categories")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data;
        if (active && Array.isArray(data)) {
          setCategories(data.map((c: string | { name: string }) => (typeof c === "string" ? c : c.name)).filter(Boolean));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
