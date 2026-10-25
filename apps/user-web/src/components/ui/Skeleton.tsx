import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const Skeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div 
      className={`relative overflow-hidden bg-slate-200/80 rounded-md ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
    </div>
  );
};

export const EventCardSkeleton = () => {
  return (
    <div className="flex flex-col">
      <Skeleton className="w-full aspect-square md:aspect-4/5 rounded-xl mb-3" />
      <div className="flex flex-col flex-1">
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-5 w-3/4 mb-1" />
        <Skeleton className="h-5 w-2/3 mb-3" />
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    </div>
  );
};

export const BannerSkeleton = () => {
  return (
    <div className="relative w-full h-full flex justify-center items-center overflow-hidden">
      {/* Left Peek Banner (Visible on all screens with exact BookMyShow proportion) */}
      <div 
        className="absolute left-1/2 top-0 w-[84%] sm:w-[80%] md:w-[78%] lg:w-[76%] max-w-300 h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-md border border-slate-200/90 bg-slate-200 pointer-events-none"
        style={{ transform: 'translateX(calc(-150% - 14px))' }}
      >
        <div 
          className="absolute inset-0 -translate-x-full animate-shimmer pointer-events-none" 
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)' }}
        />
      </div>

      {/* Main Center Banner Card Skeleton */}
      <div 
        className="absolute left-1/2 top-0 w-[84%] sm:w-[80%] md:w-[78%] lg:w-[76%] max-w-300 h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-300/80 bg-slate-200"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div 
          className="absolute inset-0 -translate-x-full animate-shimmer pointer-events-none z-10" 
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)' }}
        />
      </div>

      {/* Right Peek Banner (Visible on all screens with exact BookMyShow proportion) */}
      <div 
        className="absolute left-1/2 top-0 w-[84%] sm:w-[80%] md:w-[78%] lg:w-[76%] max-w-300 h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-md border border-slate-200/90 bg-slate-200 pointer-events-none"
        style={{ transform: 'translateX(calc(50% + 14px))' }}
      >
        <div 
          className="absolute inset-0 -translate-x-full animate-shimmer pointer-events-none" 
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)' }}
        />
      </div>

      {/* Navigation Arrows Skeleton */}
      <div className="absolute left-1.5 sm:left-3 md:left-5 lg:left-7 top-1/2 -translate-y-1/2 z-30 w-8 h-12 md:w-9 md:h-14 bg-black/40 backdrop-blur-sm text-white/50 flex items-center justify-center rounded-lg md:rounded-xl shadow-lg border border-white/10 pointer-events-none">
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 opacity-60" />
      </div>
      <div className="absolute right-1.5 sm:right-3 md:right-5 lg:right-7 top-1/2 -translate-y-1/2 z-30 w-8 h-12 md:w-9 md:h-14 bg-black/40 backdrop-blur-sm text-white/50 flex items-center justify-center rounded-lg md:rounded-xl shadow-lg border border-white/10 pointer-events-none">
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 opacity-60" />
      </div>

      {/* Bottom Indicators Skeleton */}
      <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-xs" />
        <div className="w-5 h-1.5 rounded-full bg-amber-400 shadow-xs" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-xs" />
      </div>
    </div>
  );
};

export const EventListRowSkeleton = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-100 bg-white gap-4 shadow-xs">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {/* Date block */}
        <Skeleton className="w-16 h-18 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
        {/* Poster */}
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-22 rounded-2xl shrink-0" />
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        </div>
      </div>
      {/* Right action */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:pl-4 sm:border-l sm:border-slate-100">
        <Skeleton className="h-8 w-16 rounded-md sm:hidden" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
    </div>
  );
};

export const EventDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-10">
        <div className="w-full md:w-[35%] flex flex-col gap-6">
          <Skeleton className="w-full aspect-3/4 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col pt-2 md:pt-4">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="flex flex-col gap-3 mb-8">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl mb-8" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
