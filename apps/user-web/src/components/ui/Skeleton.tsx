import React from 'react';

export const Skeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 rounded-md ${className} before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent`}
    />
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
    <div className="relative w-full h-40 sm:h-56 md:h-80 lg:h-96 flex justify-center items-center overflow-hidden bg-gray-100 py-4">
      <Skeleton className="w-11/12 max-w-7xl h-full rounded-xl md:rounded-2xl shadow-md" />
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
