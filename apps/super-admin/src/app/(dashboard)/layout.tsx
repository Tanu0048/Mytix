"use client";

import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  // Sync latest user role & info from backend on mount
  useEffect(() => {
    if (token) {
      api.get("/me")
        .then((res) => {
          if (res.data?.data) {
            setUser(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [token, setUser]);

  return (
    <div className="min-h-screen bg-[#FBFBFC]">
      <Sidebar />
      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Header />
        <main className="flex-1 p-8 pt-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
