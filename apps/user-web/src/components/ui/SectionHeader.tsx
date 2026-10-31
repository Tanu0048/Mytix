import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Small label above the title. */
  eyebrow?: string;
  action?: { href: string; label: string };
  /** Extra controls rendered on the right, e.g. filter tabs. */
  children?: React.ReactNode;
}

export default function SectionHeader({ title, description, eyebrow, action, children }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-extrabold sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {(children || action) && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {children}
          {action && (
            <Link
              href={action.href}
              className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-50 px-4 text-sm font-semibold text-ink ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-400 hover:ring-brand-400"
            >
              {action.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
