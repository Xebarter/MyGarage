import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  FileText,
  Mail,
  Phone,
  RotateCcw,
  Shield,
} from 'lucide-react';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { cn } from '@/lib/utils';

export type LegalSectionContent = {
  id: string;
  title: string;
  body?: string[];
  bullets?: string[];
  ordered?: string[];
  subsections?: { heading: string; body?: string[]; bullets?: string[] }[];
  table?: { headers: string[]; rows: string[][] };
  footerNote?: string;
};

const policyLinks = [
  { href: '/terms-and-conditions', label: 'Terms & Conditions', short: 'Terms', icon: FileText },
  { href: '/privacy-policy', label: 'Privacy Policy', short: 'Privacy', icon: Shield },
  { href: '/refund-policy', label: 'Refund Policy', short: 'Refunds', icon: RotateCcw },
] as const;

export function LegalDocumentShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="relative min-h-[60vh] bg-gradient-to-b from-muted/35 via-background to-background">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.07] to-transparent"
          aria-hidden
        />
        <div className="relative">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function LegalPolicyNav({ activeHref }: { activeHref: string }) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Legal documents"
    >
      {policyLinks.map((link) => {
        const Icon = link.icon;
        const active = activeHref === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
              active
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/80 bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LegalHero({
  badge,
  title,
  description,
  effectiveDate,
  lastUpdated,
  highlights,
  activeHref,
}: {
  badge: string;
  title: string;
  description: string;
  effectiveDate?: string;
  lastUpdated: string;
  highlights?: { label: string; value: string }[];
  activeHref: string;
}) {
  return (
    <header className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05] md:p-8">
      <LegalPolicyNav activeHref={activeHref} />
      <div className="mt-5 space-y-4">
        <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {badge}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">{title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            {effectiveDate ? <span>Effective: {effectiveDate}</span> : null}
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
      </div>
      {highlights && highlights.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

export function LegalTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row[0]}
              className={cn(
                'align-top transition-colors hover:bg-muted/20',
                rowIndex < rows.length - 1 && 'border-b border-border/60',
              )}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${row[0]}-${cellIndex}`}
                  className="px-4 py-3 text-muted-foreground leading-relaxed"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineLinks(text: string) {
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!emailMatch) return text;
  const [email] = emailMatch;
  const parts = text.split(email);
  return (
    <>
      {parts[0]}
      <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">
        {email}
      </a>
      {parts[1]}
    </>
  );
}

export function LegalSection({ section }: { section: LegalSectionContent }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-28 rounded-2xl border border-border/80 bg-card p-5 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] md:p-7"
    >
      <h2 className="text-base font-bold tracking-tight text-foreground md:text-lg">{section.title}</h2>

      {section.body ? (
        <div className="mt-4 space-y-3">
          {section.body.map((paragraph, index) => (
            <p key={index} className="text-sm leading-7 text-muted-foreground md:text-[15px]">
              {renderInlineLinks(paragraph)}
            </p>
          ))}
        </div>
      ) : null}

      {section.subsections?.map((sub) => (
        <div key={sub.heading} className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">{sub.heading}</h3>
          {sub.body ? (
            <div className="mt-2 space-y-2">
              {sub.body.map((p, index) => (
                <p key={index} className="text-sm leading-7 text-muted-foreground md:text-[15px]">
                  {renderInlineLinks(p)}
                </p>
              ))}
            </div>
          ) : null}
          {sub.bullets ? (
            <LegalBulletList items={sub.bullets} className="mt-2" />
          ) : null}
        </div>
      ))}

      {section.bullets ? <LegalBulletList items={section.bullets} className="mt-4" /> : null}

      {section.ordered ? (
        <ol className="mt-4 list-decimal space-y-2.5 pl-5 marker:text-primary/80">
          {section.ordered.map((item, index) => (
            <li key={index} className="pl-1 text-sm leading-7 text-muted-foreground md:text-[15px]">
              {renderInlineLinks(item)}
            </li>
          ))}
        </ol>
      ) : null}

      {section.table ? <LegalTable headers={section.table.headers} rows={section.table.rows} /> : null}

      {section.footerNote ? (
        <p className="mt-4 rounded-lg bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
          {section.footerNote}
        </p>
      ) : null}
    </section>
  );
}

function LegalBulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((bullet, index) => (
        <li
          key={index}
          className="flex gap-3 text-sm leading-7 text-muted-foreground md:text-[15px]"
        >
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
          <span className="min-w-0 flex-1">{renderInlineLinks(bullet)}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalTableOfContents({ sections }: { sections: { id: string; title: string }[] }) {
  return (
    <nav
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
      aria-label="On this page"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
      <ol className="mt-3 space-y-0.5">
        {sections.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="group flex items-start gap-1 rounded-lg px-2 py-1.5 text-xs leading-snug text-muted-foreground transition hover:bg-muted/50 hover:text-foreground sm:text-sm"
            >
              <ChevronRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <span>{item.title.replace(/^\d+\.\s*/, '')}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalContentLayout({
  sections,
  children,
}: {
  sections: { id: string; title: string }[];
  children: ReactNode;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-10 xl:grid-cols-[minmax(0,240px)_1fr]">
      <aside className="hidden lg:block">
        <LegalTableOfContents sections={sections} />
      </aside>
      <div className="min-w-0 space-y-4 md:space-y-5">{children}</div>
    </div>
  );
}

export function LegalContactStrip({
  primaryEmail = 'support@mygarage.ug',
  privacyEmail = 'dpo@mygarage.ug',
  phone = '+256 783 676 313',
  extra,
}: {
  primaryEmail?: string;
  privacyEmail?: string;
  phone?: string;
  extra?: ReactNode;
}) {
  return (
    <aside className="mt-10 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
      <h2 className="text-sm font-semibold text-foreground md:text-base">Questions about this document?</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Our team can help with orders, returns, privacy requests, and policy clarifications.
      </p>
      <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <li>
          <a
            href={`mailto:${primaryEmail}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            {primaryEmail}
          </a>
        </li>
        <li>
          <a
            href={`mailto:${privacyEmail}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            {privacyEmail}
          </a>
        </li>
        <li>
          <a
            href="tel:+256783676313"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {phone}
          </a>
        </li>
      </ul>
      {extra ? <div className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">{extra}</div> : null}
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/contact-us" className="font-medium text-primary hover:underline">
          Contact us
        </Link>
        {' · '}
        <Link href="/" className="font-medium text-primary hover:underline">
          Back to shop
        </Link>
      </p>
    </aside>
  );
}

export function legalSectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
