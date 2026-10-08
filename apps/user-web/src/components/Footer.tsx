import React from 'react';
import Link from 'next/link';
import { CircleHelp, Ticket, ShieldCheck, Globe, MessageCircle, Camera, Play } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#333338] text-gray-300 pt-12 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Section - Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-gray-600 text-center">
          <div className="flex flex-col items-center">
            <CircleHelp className="w-12 h-12 mb-4 text-gray-400 hover:text-white transition" />
            <h3 className="text-white font-bold mb-2">24/7 CUSTOMER CARE</h3>
            <p className="text-sm text-gray-400">We are here to help you anytime, anywhere.</p>
          </div>
          <div className="flex flex-col items-center">
            <Ticket className="w-12 h-12 mb-4 text-gray-400 hover:text-white transition" />
            <h3 className="text-white font-bold mb-2">RESEND BOOKING CONFIRMATION</h3>
            <p className="text-sm text-gray-400">Lost your ticket? Get it instantly on your email/SMS.</p>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-12 h-12 mb-4 text-gray-400 hover:text-white transition" />
            <h3 className="text-white font-bold mb-2">SUBSCRIBE TO THE NEWSLETTER</h3>
            <p className="text-sm text-gray-400">Stay updated on the latest events and offers.</p>
          </div>
        </div>

        {/* Middle Section - Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Movies By Genre</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition">Action Movies</Link></li>
              <li><Link href="#" className="hover:text-white transition">Comedy Movies</Link></li>
              <li><Link href="#" className="hover:text-white transition">Romantic Movies</Link></li>
              <li><Link href="#" className="hover:text-white transition">Sci-Fi Movies</Link></li>
              <li><Link href="#" className="hover:text-white transition">Horror Movies</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Events</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition">Comedy Shows</Link></li>
              <li><Link href="#" className="hover:text-white transition">Music Concerts</Link></li>
              <li><Link href="#" className="hover:text-white transition">Workshops</Link></li>
              <li><Link href="#" className="hover:text-white transition">Theatre</Link></li>
              <li><Link href="#" className="hover:text-white transition">Sports</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Help</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Current Openings</Link></li>
              <li><Link href="#" className="hover:text-white transition">Press Release</Link></li>
              <li><Link href="#" className="hover:text-white transition">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Mytix Exclusives</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition">Mytix Stream</Link></li>
              <li><Link href="#" className="hover:text-white transition">Superstar Program</Link></li>
              <li><Link href="#" className="hover:text-white transition">Gift Cards</Link></li>
              <li><Link href="#" className="hover:text-white transition">Offers & Rewards</Link></li>
              <li><Link href="#" className="hover:text-white transition">List your Show</Link></li>
            </ul>
          </div>
        </div>

        {/* Logo and Socials */}
        <div className="flex flex-col items-center pt-8 border-t border-gray-600">
          <div className="text-3xl font-black tracking-tighter text-white mb-6">
            Mytix<span className="text-red-500">.</span>
          </div>
          <div className="flex space-x-6 mb-8">
            <Link href="#" className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-white hover:text-[#333338] transition">
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-white hover:text-[#333338] transition">
              <Globe className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-white hover:text-[#333338] transition">
              <Camera className="w-5 h-5" />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center hover:bg-white hover:text-[#333338] transition">
              <Play className="w-5 h-5" />
            </Link>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            <p>Copyright 2026 © Mytix Entertainment Pvt. Ltd. All Rights Reserved.</p>
            <p className="mt-2">
              The content and images used on this site are copyright protected and copyrights vests with the respective owners. 
              The usage of the content and images on this website is intended to promote the works and no endorsement of the artist shall be implied.
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
