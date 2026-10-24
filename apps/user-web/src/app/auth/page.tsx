"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Ticket, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff,
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { API_BASE } from '@/config/api';

export default function AuthPage() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordCriteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^a-zA-Z0-9]/.test(password) }
  ];

  const isEmailValid = email.includes('@') && email.includes('.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Authentication failed');
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem('token', data.tokens.accessToken);
      } else if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Session cookies are automatically stored by browser. Fetch authenticated user profile:
      await fetchUser();
      toast.success(isLogin ? 'Logged in successfully!' : 'Account created successfully!');
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF9F5] select-none">
      
      {/* ================= LEFT COLUMN: BRAND & TICKETING EXPERIENCE (DESKTOP) ================= */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-[#0F0F13] text-white p-12 xl:p-16 flex-col justify-between overflow-hidden">
        
        {/* Ambient Golden Stage Beams & Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-112 h-112 bg-amber-400/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-amber-600/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center group">
            <Image 
              src="/mytix-logo-white.png" 
              alt="Mytix" 
              width={140} 
              height={46} 
              priority
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
        </div>

        {/* Center Live Event Headline & Floating Ticket Artwork */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-300/20 text-amber-300 text-xs font-bold tracking-wide uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Australia&apos;s Next-Gen Live Pass</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-[1.12] tracking-tight text-white mb-4">
            Unlock Unforgettable <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400">
              Live Experiences.
            </span>
          </h1>

          <p className="text-slate-400 text-sm xl:text-base font-medium leading-relaxed mb-8">
            Get instant access to live concerts, arena tours, comedy festivals, and exclusive presales across Australia.
          </p>

          {/* 3D Floating Ticket Visual */}
          <div className="relative max-w-sm rounded-3xl p-6 bg-gradient-to-br from-amber-400/20 via-amber-600/10 to-slate-900/60 border border-amber-300/30 backdrop-blur-xl shadow-2xl shadow-amber-500/10 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between pb-4 border-b border-dashed border-amber-300/25">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/90 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
                  🎟️
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300/80">Golden Pass</span>
                  <p className="text-sm font-bold text-white leading-tight">Live Nation Tour 2026</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black tracking-wider uppercase">
                Verified
              </span>
            </div>

            <div className="pt-4 flex justify-between items-end">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Sydney • Melbourne • Brisbane</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-amber-200 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Mobile Entry</span>
                </div>
              </div>
              <div className="flex gap-1">
                {[4, 8, 3, 7, 5, 9, 6].map((h, i) => (
                  <div key={i} className="w-1 bg-amber-300/60 rounded-full" style={{ height: `${h * 2.5}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Guaranteed Authentic</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span>50k+ Happy Fans</span>
          </div>
        </div>

      </div>

      {/* ================= RIGHT COLUMN: AUTH CARD ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 min-h-screen">
        
        <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-9 relative">
          
          {/* Back Link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image 
                src="/mytix-logo.png" 
                alt="Mytix" 
                width={130} 
                height={42} 
                priority
                className="h-8.5 w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {isLogin ? 'Sign in to access your tickets & bookings' : 'Join Mytix to book Australia’s top events'}
            </p>
          </div>

          {/* Toggle Tab Switcher */}
          <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60 border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60 border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-red-600 text-xs sm:text-sm font-semibold animate-in fade-in">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Auth Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Full Name (Sign Up only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-400"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-400"
                  placeholder="name@example.com"
                />
                {isEmailValid && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Password with Hide / Unhide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => toast.info('Password reset instructions will be sent to your email.')}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-11 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-400"
                  placeholder="••••••••••••"
                />
                {/* 👁️ Hide / Unhide Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
              </div>

              {/* Password Strength Checklist (Sign Up only) */}
              {!isLogin && password.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password Checklist
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {passwordCriteria.map((crit, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center text-xs font-semibold ${
                          crit.met ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {crit.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 mr-1.5 shrink-0" />
                        )}
                        <span>{crit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F5BF26] via-[#F8CB46] to-[#E6AC10] hover:brightness-105 active:scale-[0.99] py-3 text-sm font-black text-slate-950 transition-all shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Mytix' : 'Create My Account'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="px-3 bg-white">or</span>
              </div>
            </div>

            {/* Google Login Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => toast.info('Google sign-in is rolling out soon!')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>

          {/* Bottom Switch Note */}
          <p className="mt-6 text-center text-xs font-semibold text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-amber-600 hover:text-amber-700 font-bold hover:underline transition-colors cursor-pointer"
            >
              {isLogin ? 'Sign up for free' : 'Sign in here'}
            </button>
          </p>

        </div>

      </div>

    </div>
  );
}
