"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Ticket, 
  Lock, 
  Mail, 
  ArrowRight, 
  Shield, 
  User, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles,
  AlertCircle
} from "lucide-react";

export default function LoginPage() {
  const [loginType, setLoginType] = useState<"ADMIN" | "ORGANISER">("ADMIN");
  const [email, setEmail] = useState("admin@mytix.example.com");
  const [password, setPassword] = useState("AdminSecurePassword123!");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  // Pre-fill demo credentials on role change
  useEffect(() => {
    useAuthStore.setState({ error: null });
    if (loginType === "ADMIN") {
      setEmail("admin@mytix.example.com");
      setPassword("AdminSecurePassword123!");
    } else {
      setEmail("aman8447607490@gmail.com");
      setPassword("OrganiserPass123!");
    }
  }, [loginType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-[#FAF8F5] overflow-hidden select-none">
      
      {/* ================= LEFT HALF: BRANDING & 3D ARTWORK ================= */}
      <div className="relative w-full lg:w-1/2 bg-[#121215] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden h-full">
        
        {/* Ambient Golden Glow Beams */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-112.5 h-112.5 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-100 h-100 bg-amber-600/15 rounded-full blur-[110px] pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30">
            <Ticket className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white lowercase">
            mytix
          </span>
        </div>

        {/* Center Headline & Content */}
        <div className="relative z-10 my-auto py-6 max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-[50px] font-black leading-[1.12] tracking-tight text-white mb-4">
            Manage Your <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-amber-100 to-amber-300">
              Events Effortlessly.
            </span>
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-400 leading-relaxed max-w-md">
            The all-in-one platform for organizers and admins.
          </p>
        </div>

        {/* 3D Floating Ticket Artworks (CSS + SVG) */}
        
        {/* Ticket 1: Top Right Floating Ticket */}
        <div className="absolute -right-6 top-16 sm:top-24 w-64 sm:w-76 transform rotate-[-28deg] pointer-events-none select-none z-0">
          <div className="relative p-6 rounded-3xl bg-linear-to-br from-amber-300/40 via-amber-500/25 to-amber-700/10 border border-amber-300/50 backdrop-blur-md shadow-[0_20px_50px_rgba(245,190,40,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-300/30">
              <div className="w-6 h-6 rounded-lg bg-amber-400/60" />
              <div className="space-y-1">
                <div className="w-16 h-1.5 rounded-full bg-amber-200/50 ml-auto" />
                <div className="w-10 h-1 rounded-full bg-amber-200/30 ml-auto" />
              </div>
            </div>
            <div className="pt-3 flex justify-between items-end">
              <div className="space-y-1.5">
                <div className="w-20 h-2 rounded-full bg-amber-200/60" />
                <div className="w-12 h-1.5 rounded-full bg-amber-200/40" />
              </div>
              <div className="w-8 h-8 rounded-full border border-amber-300/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
            </div>
          </div>
          {/* Golden Light Beam Streak */}
          <div className="absolute top-1/2 -left-20 w-80 h-1 bg-linear-to-r from-transparent via-amber-300/80 to-transparent transform rotate-45 blur-xs" />
        </div>

        {/* Ticket 2: Bottom Left Large Glowing Ticket */}
        <div className="absolute -left-10 bottom-6 sm:bottom-12 w-80 sm:w-96 transform rotate-14 pointer-events-none select-none z-0">
          <div className="relative p-7 rounded bg-linear-to-br from-amber-400/50 via-amber-500/30 to-amber-900/20 border-2 border-amber-300/60 backdrop-blur-lg shadow-[0_25px_60px_rgba(245,190,40,0.35)]">
            <div className="flex items-center justify-between pb-4 border-b border-dashed border-amber-200/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-300/80 flex items-center justify-center text-slate-950 font-black text-xs">M</div>
                <div className="w-24 h-2 rounded-full bg-amber-100/70" />
              </div>
              <div className="px-2.5 py-1 rounded-full bg-amber-300/30 border border-amber-200/40 text-[10px] font-black text-amber-200 uppercase">VIP ACCESS</div>
            </div>
            <div className="pt-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-200/70 uppercase tracking-widest">LIVE CONCERT</p>
                <div className="w-28 h-3 rounded-full bg-amber-100/80 mt-1" />
              </div>
              <div className="font-mono text-sm font-black text-amber-200 tracking-wider">₹5,000</div>
            </div>
          </div>
        </div>

        {/* Scattered Confetti Ribbons */}
        <div className="absolute top-12 left-1/3 w-3 h-3 bg-amber-400 rounded-sm rotate-45 opacity-80" />
        <div className="absolute top-1/3 left-16 w-2.5 h-2.5 bg-amber-300 rounded-full opacity-60" />
        <div className="absolute top-2/3 right-1/4 w-3.5 h-2 bg-amber-400/80 rounded-xs rotate-12" />
        <div className="absolute bottom-28 right-16 w-3 h-3 bg-amber-200/90 rounded-sm rotate-45" />

        {/* Bottom spacer */}
        <div className="relative z-10" />
      </div>

      {/* ================= RIGHT HALF: LOGIN CARD ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-10 h-full overflow-hidden">
        
        <div className="w-full max-w-105 bg-white rounded-3xl sm:rounded-4xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-slate-100 p-6 sm:p-8 lg:p-9 animate-in fade-in slide-in-from-bottom-3 duration-500 relative">
          
          {/* Top Ticket Icon Circle */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#FFF5DA] border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs">
              <Ticket className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Sign in to the Mytix Dashboard
            </p>
          </div>

          {/* Role Switcher Pill */}
          <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-5 border border-slate-200/50">
            <button
              type="button"
              onClick={() => setLoginType("ADMIN")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                loginType === "ADMIN"
                  ? "bg-white text-amber-950 border border-amber-300/80 shadow-[0_2px_10px_rgba(245,190,40,0.18)]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${loginType === "ADMIN" ? "text-amber-600" : "text-slate-400"}`} />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginType("ORGANISER")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                loginType === "ORGANISER"
                  ? "bg-white text-amber-950 border border-amber-300/80 shadow-[0_2px_10px_rgba(245,190,40,0.18)]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className={`w-3.5 h-3.5 ${loginType === "ORGANISER" ? "text-amber-600" : "text-slate-400"}`} />
              <span>Organiser</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200/80 flex items-center gap-2 text-red-600 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                />
                {isEmailValid && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-10 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => alert("Password reset link will be sent to your email.")}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Golden Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-[#F5BF26] to-[#E6AC10] hover:from-[#E6AC10] hover:to-[#D99D05] py-3 text-xs font-black text-slate-950 transition-all shadow-[0_8px_20px_rgba(245,190,40,0.35)] hover:shadow-[0_10px_24px_rgba(245,190,40,0.45)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              <span>{isLoading ? "Signing In..." : `Sign In as ${loginType === "ADMIN" ? "Admin" : "Organiser"}`}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
            </button>

          </form>

          {/* Bottom Signup Link */}
          <div className="text-center mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setLoginType("ORGANISER")}
                className="font-black text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
