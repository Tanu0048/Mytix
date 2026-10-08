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
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 px-2 rounded-lg">
      <div className="flex flex-col items-center justify-center min-w-15">
        <Skeleton className="h-3 w-8 mb-1" />
        <Skeleton className="h-6 w-8" />
      </div>
      <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <Skeleton className="h-5 w-1/2 mb-1" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="hidden sm:block">
        <Skeleton className="h-8 w-24 rounded-full" />
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
