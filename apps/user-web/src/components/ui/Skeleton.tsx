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
      {/* Left Peek Banner (Visible on large screens like BookMyShow carousel) */}
      <div className="hidden lg:block absolute left-[-42%] xl:left-[-38%] w-11/12 max-w-7xl h-full opacity-30 scale-95 pointer-events-none rounded-2xl md:rounded-3xl bg-linear-to-r from-slate-200 to-slate-100 border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* Main Center Banner Card */}
      <div className="relative w-11/12 max-w-7xl h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-800/20 bg-linear-to-br from-slate-900 via-slate-850 to-slate-950 px-4 sm:px-8 md:px-12 py-5 sm:py-8 md:py-10 flex flex-col justify-between">
        {/* Animated Shimmer Wave across the entire card */}
        <div 
          className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/12 to-transparent pointer-events-none z-10" 
        />

        {/* Ambient Glows in background */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar: Category / Live Badge + City Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 sm:h-7 w-24 sm:w-28 rounded-full bg-amber-400/20 border border-amber-400/35 flex items-center gap-2 px-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="h-2 w-12 sm:w-14 rounded bg-amber-200/70" />
            </div>
            <div className="hidden sm:flex h-6 sm:h-7 w-24 rounded-full bg-white/10 backdrop-blur-md border border-white/10 items-center px-3">
              <div className="h-2 w-14 rounded bg-white/30" />
            </div>
          </div>

          <div className="h-6 sm:h-7 w-18 sm:w-22 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <div className="h-2 w-10 sm:w-12 rounded bg-white/30" />
          </div>
        </div>

        {/* Center / Bottom Info Block */}
        <div className="relative z-10 mt-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2.5 sm:space-y-3.5 max-w-xl">
            {/* Tagline / Subtitle */}
            <div className="h-3 sm:h-3.5 w-32 sm:w-44 rounded-md bg-white/20" />
            
            {/* Main Headline (2 lines) */}
            <div className="h-6 sm:h-8 md:h-10 w-3/4 sm:w-4/5 rounded-lg bg-white/30" />
            <div className="hidden sm:block h-5 sm:h-7 md:h-8 w-1/2 rounded-lg bg-white/20" />

            {/* Date & Location Chips */}
            <div className="flex items-center gap-2 sm:gap-3 pt-1">
              <div className="h-5 sm:h-6 w-28 sm:w-36 rounded-md bg-white/15 flex items-center gap-2 px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
                <div className="h-2 w-20 rounded bg-white/25" />
              </div>
              <div className="h-5 sm:h-6 w-24 sm:w-32 rounded-md bg-white/15 flex items-center gap-2 px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
                <div className="h-2 w-16 rounded bg-white/25" />
              </div>
            </div>
          </div>

          {/* Action CTA Button Skeleton */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="h-10 sm:h-12 w-28 sm:w-36 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-500/20 flex items-center justify-center px-4">
              <div className="h-3 w-16 sm:w-20 rounded bg-slate-950/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Peek Banner (Visible on large screens) */}
      <div className="hidden lg:block absolute right-[-42%] xl:right-[-38%] w-11/12 max-w-7xl h-full opacity-30 scale-95 pointer-events-none rounded-2xl md:rounded-3xl bg-linear-to-l from-slate-200 to-slate-100 border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* Navigation Arrows Skeleton */}
      <div className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-md flex items-center justify-center text-slate-300">
        <ChevronLeft className="w-5 h-5 md:w-8 md:h-8 opacity-40" />
      </div>
      <div className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-md flex items-center justify-center text-slate-300">
        <ChevronRight className="w-5 h-5 md:w-8 md:h-8 opacity-40" />
      </div>

      {/* Bottom Indicators Skeleton */}
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <div className="h-2 w-6 rounded-full bg-amber-400 shadow-sm" />
        <div className="h-2 w-2 rounded-full bg-slate-300/80" />
        <div className="h-2 w-2 rounded-full bg-slate-300/80" />
        <div className="h-2 w-2 rounded-full bg-slate-300/80" />
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
