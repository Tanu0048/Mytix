import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  /** Mobile drawer open state (not persisted). */
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (isCollapsed) => set({ isCollapsed }),
      isMobileOpen: false,
      setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
    }),
    {
      name: "mytix-sidebar-state",
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);
