import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { formatPrice, formatShortDate, formatVenue, getEventStatus } from '@/lib/event';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EventCardProps {
  event: any;
  /** Optional highlight shown top-left on the poster, e.g. "#1 Trending". */
  badge?: string;
  /** Emphasise the badge in brand yellow instead of the neutral dark style. */
  badgeHighlight?: boolean;
  sizes?: string;
  priority?: boolean;
}

/**
 * The one event card used across the site: poster, date + city, title,
 * venue and price. The whole card is a single link.
 */
export default function EventCard({
  event,
  badge,
  badgeHighlight = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  priority = false,
}: EventCardProps) {
  const status = getEventStatus(event);
  const city = event?.venue?.city;
  const venue = formatVenue(event);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col rounded-2xl focus-visible:outline-offset-4"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-900/5 transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-16px_rgb(233_174_0/0.55)] group-hover:ring-2 group-hover:ring-brand-400">
        <SafeImage
          src={event.posterPath}
          alt={event.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {(badge || event.category) && (
          <span
            className={`absolute left-2.5 top-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              badge && badgeHighlight
                ? 'bg-brand-400 text-ink'
                : 'bg-white/95 text-ink shadow-sm backdrop-blur-sm'
            }`}
          >
            {badge || event.category}
          </span>
        )}

        {(status.isClosed || status.isSoldOut || status.isLowStock) && (
          <span
            className={`absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
              status.isLowStock && !status.isClosed
                ? 'bg-ink/85 text-brand-300'
                : 'bg-ink/85 text-white'
            }`}
          >
            {status.isClosed ? 'Booking closed' : status.isSoldOut ? 'Sold out' : `Only ${status.available} left`}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-700">
          {formatShortDate(status.startsAt)}
          {city && <span className="text-slate-400"> · {city}</span>}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand-700 sm:text-base">
          {event.title}
        </h3>
        {venue && <p className="mt-0.5 truncate text-sm text-slate-500">{venue}</p>}
        <p className="mt-2 text-sm font-semibold text-ink">
          {status.isBookable ? (
            status.priceFrom > 0 ? (
              <span className="inline-flex items-baseline gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-brand-800">
                <span className="text-xs font-medium">From</span>
                <span className="font-bold">{formatPrice(status.priceFrom)}</span>
              </span>
            ) : status.isFree ? (
              'Free'
            ) : (
              <span className="font-medium text-slate-500">See ticket options</span>
            )
          ) : (
            <span className="font-medium text-slate-400">Not available</span>
          )}
        </p>
      </div>
    </Link>
  );
}
