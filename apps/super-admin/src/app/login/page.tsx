"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Ticket, Lock, Mail, ArrowRight, UserCheck, Shield } from "lucide-react";

export default function LoginPage() {
  const [loginType, setLoginType] = useState<"ADMIN" | "ORGANISER">("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  // Clear any persisted error on load
  useEffect(() => {
    useAuthStore.setState({ error: null });
    if (loginType === "ADMIN") {
      setEmail("admin@mytix.example.com");
      setPassword("AdminSecurePassword123!");
    } else {
      setEmail("");
      setPassword("");
    }
  }, [loginType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const role = await login(email, password);
    if (role) {
      if (loginType === "ADMIN" && role !== "ADMIN") {
        useAuthStore.setState({ error: "You are not an Admin. Please use the Organiser login." });
        useAuthStore.getState().logout();
      } else if (loginType === "ORGANISER" && role !== "ORGANISER") {
        useAuthStore.setState({ error: "You are not an Organiser. Please use the Admin login." });
        useAuthStore.getState().logout();
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
            <Ticket className="h-8 w-8" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm font-semibold text-slate-500 mt-2">Sign in to the Mytix Dashboard</p>
        </div>

        {/* Login Type Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button
            onClick={() => setLoginType("ADMIN")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              loginType === "ADMIN" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Shield className="w-4 h-4" /> Admin
          </button>
          <button
            onClick={() => setLoginType("ORGANISER")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              loginType === "ORGANISER" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Organiser
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-100 animate-in fade-in">
            <p className="text-sm font-bold text-red-600 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                placeholder={loginType === "ADMIN" ? "admin@mytix.com" : "organiser@business.com"} 
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : `Sign In as ${loginType === "ADMIN" ? "Admin" : "Organiser"}`}
            {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
