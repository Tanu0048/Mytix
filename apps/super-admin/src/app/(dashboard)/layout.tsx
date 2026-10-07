import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="w-64 h-screen bg-slate-900 border-r border-slate-800 hidden lg:block fixed" />}>
        <Sidebar />
      </Suspense>
      <main className="lg:ml-64 min-h-screen">
        <div className="mx-auto max-w-7xl p-8 pt-10">{children}</div>
      </main>
    </>
  );
}
