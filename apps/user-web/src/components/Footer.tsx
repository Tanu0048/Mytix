"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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

        {/* Middle Section - Links (Centered & Aligned) */}
        <div className="py-10 max-w-xl mx-auto">
          <div className="grid grid-cols-2 gap-10 sm:gap-20 text-left">
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Events</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="/events?category=comedy" className="hover:text-white transition-colors">Comedy Shows</Link></li>
                <li><Link href="/events?category=concert" className="hover:text-white transition-colors">Music Concerts</Link></li>
                <li><Link href="/events?category=workshop" className="hover:text-white transition-colors">Workshops</Link></li>
                <li><Link href="/events?category=theatre" className="hover:text-white transition-colors">Theatre</Link></li>
                <li><Link href="/events?category=sports" className="hover:text-white transition-colors">Sports</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Help</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Logo and Dynamic Socials */}
        <div className="flex flex-col items-center pt-8 border-t border-gray-600">
          <div className="mb-6">
            <Image 
              src="/mytix-logo-white.png" 
              alt="Mytix" 
              width={140} 
              height={45} 
              className="h-9 w-auto object-contain"
            />
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
          
          <div className="text-xs text-gray-500 text-center max-w-3xl mx-auto">
            <p>Copyright 2026 © Mytix Entertainment Pvt. Ltd. All Rights Reserved.</p>
            <p className="mt-2">
              The content and images used on this site are copyright protected and copyrights vests with the respective owners. 
              The usage of the content and images on this website is intended to promote the works and no endorsement of the artist shall be implied.
            </p>
          </div>

          {/* SEO Keywords Footer Bar (Screenshot 5 Reference) */}
          <div className="mt-8 pt-6 border-t border-gray-600/50 text-center max-w-5xl mx-auto">
            <p className="text-[11px] leading-relaxed text-gray-400 uppercase tracking-wide">
              <strong className="text-gray-200 font-extrabold mr-1">POPULAR ENTERTAINMENT SEARCHES:</strong>
              <span>CONCERTS IN MELBOURNE</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>SYDNEY LIVE MUSIC GIGS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>STAND-UP COMEDY TICKETS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>BRISBANE ARENA FESTIVALS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>PERTH THEATRE & MUSICALS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>ADELAIDE FRINGE SHOWS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>GOLD COAST LIVE EVENTS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>INDIE ROCK & METAL BANDS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>ELECTRONIC DANCE MUSIC (EDM)</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>HIP-HOP CONCERTS AUSTRALIA</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>JAZZ & BLUES NIGHTCLUBS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>CREATIVE ARTS WORKSHOPS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>AFL & STADIUM SPORTS TICKETS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>LIVE ORCHESTRA & OPERA</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>DIGITAL QR TURNSTILE PASSES</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>PAPERLESS E-TICKETS</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>BUY EVENT TICKETS ONLINE</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>ZERO SURPRISE FEES TICKETING</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>MYTIX OFFICIAL ENTERTAINMENT</span> <span className="text-gray-500 mx-1.5">|</span>
              <span>LAST MINUTE TICKETS AUSTRALIA</span>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}

