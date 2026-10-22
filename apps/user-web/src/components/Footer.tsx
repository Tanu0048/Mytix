"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CircleHelp, Ticket } from 'lucide-react';
import { API_BASE } from '@/config/api';

interface SocialLink {
  id?: string;
  name: string;
  url: string;
  letter?: string;
  isActive?: boolean;
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: 'facebook', name: 'facebook', url: 'https://facebook.com', letter: 'F', isActive: true },
  { id: 'twitter', name: 'twitter', url: 'https://x.com', letter: 'X', isActive: true },
  { id: 'youtube', name: 'youtube', url: 'https://youtube.com', letter: 'Y', isActive: true },
  { id: 'instagram', name: 'instagram', url: 'https://instagram.com', letter: 'I', isActive: true }
];

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);

  useEffect(() => {
    let isMounted = true;
    async function loadSocialLinks() {
      try {
        const res = await fetch(`${API_BASE}/social-links`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setSocialLinks(data);
          }
        }
      } catch (err) {
        // Fallback to DEFAULT_SOCIAL_LINKS gracefully
      }
    }
    loadSocialLinks();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="bg-[#333338] text-gray-300 pt-12 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Section - Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10 border-b border-gray-600 text-center max-w-4xl mx-auto">
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
        </div>

        {/* Middle Section - Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-10 max-w-4xl mx-auto">
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Events</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/events?category=comedy" className="hover:text-white transition">Comedy Shows</Link></li>
              <li><Link href="/events?category=concert" className="hover:text-white transition">Music Concerts</Link></li>
              <li><Link href="/events?category=workshop" className="hover:text-white transition">Workshops</Link></li>
              <li><Link href="/events?category=theatre" className="hover:text-white transition">Theatre</Link></li>
              <li><Link href="/events?category=sports" className="hover:text-white transition">Sports</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Help</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        {/* Logo and Dynamic Socials */}
        <div className="flex flex-col items-center pt-8 border-t border-gray-600">
          <div className="text-3xl font-black tracking-tighter text-white mb-6">
            Mytix<span className="text-red-500">.</span>
          </div>

          {/* Social Icons row matching wireframe: circle with first letter + label below */}
          {socialLinks && socialLinks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-8">
              {socialLinks.map((item) => {
                const initial = (item.letter || item.name?.charAt(0) || '?').toUpperCase();
                return (
                  <a
                    key={item.id || item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center gap-2 transition-transform duration-200 hover:-translate-y-1"
                    title={`Visit ${item.name}`}
                  >
                    <div className="w-11 h-11 rounded-full border border-gray-500 bg-[#28282c] flex items-center justify-center font-black text-white text-base shadow-sm group-hover:bg-white group-hover:text-[#333338] group-hover:border-white transition-all">
                      {initial}
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors lowercase font-medium tracking-wide">
                      {item.name}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
          
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

