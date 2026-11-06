"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useAuthStore, useAuthHydrated, type User } from "@/store/useAuthStore";
import api from "@/lib/api";

/** Pages only ADMIN may open. Organisers get bounced to the overview. */
const ADMIN_ONLY_PREFIXES = ["/banners", "/organisers", "/categories", "/terms", "/social-links", "/pages"];

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  const role = user?.role;
  const isAllowed =
    hydrated &&
    !!token &&
    (role === "ADMIN" || (role === "ORGANISER" && !isAdminOnlyPath(pathname)));

  // Route guard: unauthenticated -> login, staff -> scanner, organiser on admin page -> overview
  useEffect(() => {
    if (!hydrated) return;
    if (!token || !role) {
      router.replace("/login");
    } else if (role === "STAFF") {
      router.replace("/scanner");
    } else if (role !== "ADMIN" && role !== "ORGANISER") {
      router.replace("/login");
    } else if (role === "ORGANISER" && isAdminOnlyPath(pathname)) {
      router.replace("/");
    }
  }, [hydrated, token, role, pathname, router]);

  // Sync latest role & profile from backend (/me returns the profile object directly)
  const userId = user?.id;
  useEffect(() => {
    if (!hydrated || !token || !userId) return;
    api
      .get("/me")
      .then((res) => {
        const profile = res.data as (User & { organiser?: { businessName?: string } | null }) | undefined;
        if (profile?.id) {
          const current = useAuthStore.getState().user;
          setUser({
            ...current,
            ...profile,
            businessName: profile.organiser?.businessName ?? current?.businessName,
          });
        }
      })
      .catch(() => {});
  }, [hydrated, token, userId, setUser]);

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC]">
      <Sidebar />
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-8 pt-6 sm:pt-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
