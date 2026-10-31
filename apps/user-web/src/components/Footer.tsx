"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
    <footer className="relative mt-auto bg-ink text-slate-400 border-t-4 border-brand-400">
      <div className="container-page pt-16 pb-8">

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Image
              src="/mytix-logo-white.png"
              alt="Mytix"
              width={140}
              height={45}
              className="h-8 w-auto object-contain"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Live event tickets across Australia. Find a show, pick your seat and walk in with a QR ticket on your phone.
            </p>

            {socialLinks && socialLinks.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {socialLinks.map((item) => {
                  const initial = (item.letter || item.name?.charAt(0) || '?').toUpperCase();
                  return (
                    <a
                      key={item.id || item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.name}
                      title={item.name}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-bold text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-brand-400 hover:text-ink hover:ring-brand-400"
                    >
                      {initial}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <FooterColumn
            title="Events"
            links={[
              { href: '/events', label: 'All events' },
              { href: '/events?category=concert', label: 'Concerts' },
              { href: '/events?category=comedy', label: 'Comedy' },
              { href: '/events?category=theatre', label: 'Theatre' },
              { href: '/events?category=sports', label: 'Sports' },
            ]}
          />
          <FooterColumn
            title="Help"
            links={[
              { href: '/faq', label: 'FAQs' },
              { href: '/contact', label: 'Contact us' },
              { href: '/tickets', label: 'Find my tickets' },
              { href: '/orders', label: 'Orders & invoices' },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: '/about', label: 'About Mytix' },
              { href: '/become-an-organiser', label: 'For organisers' },
              { href: '/terms', label: 'Terms & conditions' },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-start sm:justify-between">
          <p className="shrink-0">© {new Date().getFullYear()} Mytix. All rights reserved. Prices in AUD incl. GST.</p>
          <p className="max-w-xl sm:text-right">
            Event images and content are the property of their respective owners and are used to promote the events listed.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-brand-400">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-brand-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
