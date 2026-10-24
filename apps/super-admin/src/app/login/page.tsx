"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Shield, 
  User, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles,
  AlertCircle,
  QrCode
} from "lucide-react";

export default function LoginPage() {
  const [loginType, setLoginType] = useState<"ADMIN" | "ORGANISER" | "STAFF">("ADMIN");
  const [email, setEmail] = useState("admin@mytix.example.com");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("AdminSecurePassword123!");
  const [showPassword, setShowPassword] = useState(false);
  const { login, staffLogin, isLoading, error } = useAuthStore();
  const router = useRouter();

  // Reset fields & demo presets on role change
  useEffect(() => {
    useAuthStore.setState({ error: null });
    if (loginType === "ADMIN") {
      setEmail("admin@mytix.example.com");
      setPassword("AdminSecurePassword123!");
    } else if (loginType === "ORGANISER") {
      setEmail("aman8447607490@gmail.com");
      setPassword("OrganiserPass123!");
    } else {
      setStaffId("");
      setPassword("");
    }
  }, [loginType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginType === "STAFF") {
      if (!staffId.trim() || !password) {
        useAuthStore.setState({ error: "Please enter your Staff ID and Password." });
        return;
      }
      const role = await staffLogin(staffId.trim(), password);
      if (role === "STAFF") {
        router.push("/scanner");
      }
      return;
    }

    const role = await login(email, password);
    if (role) {
      if (loginType === "ADMIN" && role !== "ADMIN") {
        useAuthStore.setState({ error: "You are not an Admin. Please switch to Organiser login." });
        useAuthStore.getState().logout();
      } else if (loginType === "ORGANISER" && role !== "ORGANISER") {
        useAuthStore.setState({ error: "You are not an Organiser. Please switch to Admin login." });
        useAuthStore.getState().logout();
      } else {
        router.push("/");
      }
    }
  };

  const isEmailValid = email.includes("@") && email.includes(".");

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#FAF8F5] select-none">
      
      {/* ================= LEFT HALF: BRANDING & 3D ARTWORK (Hidden on mobile for fast, clean phone login) ================= */}
      <div className="hidden lg:flex relative w-full lg:w-1/2 bg-[#121215] text-white p-8 sm:p-12 lg:p-16 flex-col justify-between overflow-hidden">
        
        {/* Ambient Golden Glow Beams */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-112 h-112 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-amber-600/15 rounded-full blur-[110px] pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Image 
            src="/mytix-logo-white.png" 
            alt="Mytix" 
            width={140} 
            height={46} 
            priority
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Center Headline & Content */}
        <div className="relative z-10 my-auto py-6 max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-[50px] font-black leading-[1.12] tracking-tight text-white mb-4">
            Manage Your <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-amber-100 to-amber-300">
              Events Effortlessly.
            </span>
          </h1>
          <p className="text-base font-medium text-slate-400 leading-relaxed max-w-md">
            The all-in-one portal for event organisers, gate security staff, and platform administrators.
          </p>
        </div>

        {/* 3D Floating Ticket Artwork */}
        <div className="absolute -right-6 top-16 sm:top-24 w-64 sm:w-76 transform rotate-[-28deg] pointer-events-none select-none z-0">
          <div className="relative p-6 rounded-3xl bg-linear-to-br from-amber-300/40 via-amber-500/25 to-amber-700/10 border border-amber-300/50 backdrop-blur-md shadow-[0_20px_50px_rgba(245,190,40,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-300/30">
              <span className="text-xs font-black tracking-widest uppercase text-amber-200">Mytix Pass</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100">Live</span>
            </div>
            <div className="pt-4 space-y-1">
              <p className="text-lg font-black text-white">Coldplay Australia</p>
              <p className="text-xs font-semibold text-amber-200/80">Melbourne Marvel Stadium</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          Mytix Ticketing Engine © 2026
        </div>
      </div>

      {/* ================= RIGHT HALF: LOGIN CARD (Mobile Phone & Tablet & Desktop) ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-3 sm:p-6 lg:p-10 min-h-[100dvh]">
        
        <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/80 p-5 sm:p-8 relative animate-in fade-in">
          
          {/* Brand Logo (Visible on mobile and desktop) */}
          <div className="flex justify-center mb-4">
            <Image 
              src="/mytix-logo.png" 
              alt="Mytix" 
              width={130} 
              height={42} 
              priority
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>

          {/* Heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loginType === "STAFF" ? "Gate Staff Sign In" : "Welcome Back"}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
              {loginType === "STAFF" 
                ? "Sign in to launch your phone turnstile scanner" 
                : "Sign in to the Mytix Management Portal"}
            </p>
          </div>

          {/* 3-Way Role Switcher Pill (Touch-Friendly & Mobile-Fit) */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setLoginType("ADMIN")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 ${
                loginType === "ADMIN"
                  ? "bg-white text-amber-950 border border-amber-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Shield className={`w-3.5 h-3.5 shrink-0 ${loginType === "ADMIN" ? "text-amber-600" : "text-slate-400"}`} />
              <span className="truncate">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginType("ORGANISER")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 ${
                loginType === "ORGANISER"
                  ? "bg-white text-amber-950 border border-amber-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className={`w-3.5 h-3.5 shrink-0 ${loginType === "ORGANISER" ? "text-amber-600" : "text-slate-400"}`} />
              <span className="truncate">Organiser</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginType("STAFF")}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 ${
                loginType === "STAFF"
                  ? "bg-white text-amber-950 border border-amber-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <QrCode className={`w-3.5 h-3.5 shrink-0 ${loginType === "STAFF" ? "text-amber-600" : "text-slate-400"}`} />
              <span className="truncate">Staff</span>
            </button>
          </div>

          {/* Quick Staff Mode Banner */}
          {loginType === "STAFF" && (
            <div className="mb-4 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Phone Gate Scanner
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md">
                No Email Needed
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            
            {/* Input 1: Email (for Admin/Organiser) OR Staff ID (for Staff) */}
            {loginType === "STAFF" ? (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Staff ID
                </label>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                    placeholder="e.g. GATE1_ALEX or STF-101"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-3 pl-10 pr-4 text-base sm:text-sm font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={loginType === "ADMIN" ? "admin@mytix.example.com" : "organiser@business.com"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-3 pl-10 pr-10 text-base sm:text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-400"
                  />
                  {isEmailValid && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>
            )}

            {/* Input 2: Password */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-3 pl-10 pr-10 text-base sm:text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 active:scale-95"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Helper Note for Staff (No Forgot Password) */}
              {loginType === "STAFF" ? (
                <p className="text-[11px] font-medium text-slate-400 mt-1.5 text-center">
                  Staff credentials are created and managed by your event organiser.
                </p>
              ) : (
                loginType === "ADMIN" && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => alert("Password reset instructions sent to registered admin email.")}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Submit Action Button (Large Touch Target) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-[#F5BF26] to-[#E6AC10] hover:from-[#E6AC10] hover:to-[#D99D05] py-3.5 text-sm font-black text-slate-950 transition-all shadow-[0_8px_20px_rgba(245,190,40,0.3)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <span>
                {isLoading 
                  ? "Authenticating..." 
                  : loginType === "STAFF" 
                    ? "Open Gate Scanner" 
                    : `Sign In as ${loginType === "ADMIN" ? "Admin" : "Organiser"}`}
              </span>
              {!isLoading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}