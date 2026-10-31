import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LocationModal from '@/components/LocationModal';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Mytix — Live event tickets across Australia",
    template: "%s · Mytix",
  },
  description: "Find concerts, comedy and live shows across Australia. Pick your seat, pay upfront with no surprise fees, and walk in with a QR ticket on your phone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-AU"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Suspense fallback={<div className="h-16 w-full bg-white" />}>
          <Navbar />
        </Suspense>
        {children}
        <Footer />
        <Suspense fallback={null}>
          <LocationModal />
        </Suspense>
        <Toaster 
          position="top-center" 
          duration={2500}
          toastOptions={{
            className: 'bg-white text-gray-900 border-gray-100 shadow-xl',
            style: { background: '#fff', color: '#111827', border: '1px solid #f3f4f6' }
          }} 
        />
      </body>
    </html>
  );
}
