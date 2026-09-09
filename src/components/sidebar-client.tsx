"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  ShoppingCart,
  Wrench,
  BookUser,
  DollarSign,
  Search,
  ChevronRight,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { CommandPalette, OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette";
import { Avatar } from "@/components/ui/avatar";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";

const ICONS = {
  home: Home,
  tasks: ClipboardList,
  purchases: ShoppingCart,
  assets: Wrench,
  directory: BookUser,
  finance: DollarSign,
};

export type SidebarLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
};

function openSearch() {
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
}

export function SidebarClient({
  profile,
  workLinks,
  locale,
}: {
  profile: { fullName: string; role: string; avatarUrl: string | null };
  workLinks: SidebarLink[];
  locale: Locale;
}) {
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // The bottom tab bar only has room for a handful of icons before it feels
  // cramped — directory and finance are lower-frequency than the other four,
  // so they move into a "More" sheet instead of sitting in the bar itself.
  const OVERFLOW_ICONS = ["directory", "finance"] as const;
  const primaryLinks = workLinks.filter((link) => !(OVERFLOW_ICONS as readonly string[]).includes(link.icon));
  const overflowLinks = workLinks.filter((link) => (OVERFLOW_ICONS as readonly string[]).includes(link.icon));
  const overflowActive = overflowLinks.some((link) => isActive(link.href));

  return (
    <>
      <CommandPalette locale={locale} />

      {/* Mobile top bar: logo left, search + profile right. Padded for
          safe-area-inset-top explicitly rather than relying on
          apple-mobile-web-app-status-bar-style to reserve the space itself
          — that meta tag's behavior varies by how the app was added to the
          home screen, whereas env(safe-area-inset-top) is 0 whenever the
          browser already reserves the space, so this is a no-op in that
          case and a real fix when it doesn't. */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-canvas px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary">
            C
          </span>
          <span className="font-semibold tracking-tight text-ink">{dict.sidebar.appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label={dict.sidebar.search}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover active:bg-surface-hover"
          >
            <Search className="size-5" />
          </button>
          <Link href="/profile" aria-label={dict.profile.title}>
            <Avatar fullName={profile.fullName} avatarUrl={profile.avatarUrl} size="sm" />
          </Link>
        </div>
      </div>

      {/* Overflow sheet for directory/finance — backdrop closes it, sits
          above the bottom nav (which is z-20). */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label={dict.sidebar.more}
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
          />
          <div
            className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 space-y-1 rounded-2xl border border-hairline bg-surface p-2 shadow-2xl md:hidden"
            role="menu"
          >
            {overflowLinks.map((link) => {
              const Icon = ICONS[link.icon];
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={2} />
                  {link.label}
                  {!!link.badge && (
                    <span className="ml-auto rounded-full bg-status-overdue-fg px-1.5 py-0.5 text-xs font-semibold text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile bottom tab bar. Standalone (installed) mode has no browser
          chrome to keep content off the rounded corners/home indicator, so
          all three safe-area insets are padded explicitly — bottom for the
          home indicator, left/right so the outer icons aren't cut off by
          the screen's rounded corners. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden"
        aria-label={dict.sidebar.workSection}
      >
        {primaryLinks.map((link) => {
          const Icon = ICONS[link.icon];
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-ink-muted"
              }`}
            >
              <Icon className="size-5" strokeWidth={2} />
              {link.label}
              {!!link.badge && (
                <span className="absolute right-[calc(50%-18px)] top-1 flex size-4 items-center justify-center rounded-full bg-status-overdue-fg text-[10px] font-semibold text-white">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
        {overflowLinks.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              overflowActive || moreOpen ? "text-primary" : "text-ink-muted"
            }`}
          >
            <MoreHorizontal className="size-5" strokeWidth={2} />
            {dict.sidebar.more}
          </button>
        )}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 flex-col border-r border-hairline bg-canvas md:sticky md:top-0 md:flex md:h-screen md:w-64">
        <div className="flex items-center px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary">
              C
            </span>
            <span className="font-semibold tracking-tight text-ink">{dict.sidebar.appName}</span>
          </Link>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={openSearch}
            className="flex w-full items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink-faint transition-colors hover:bg-surface-hover active:bg-surface-hover"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">{dict.sidebar.searchPlaceholder}</span>
            <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 text-xs text-ink-faint">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          <SidebarSection title={dict.sidebar.workSection} links={workLinks} isActive={isActive} />
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-hover active:bg-surface-hover">
            <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar fullName={profile.fullName} avatarUrl={profile.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{profile.fullName}</p>
                <p className="truncate text-xs text-ink-muted">{dict.roles[profile.role as keyof typeof dict.roles]}</p>
              </div>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label={dict.sidebar.logout}
                className="rounded-md p-1.5 text-ink-faint hover:bg-canvas-soft active:bg-canvas-soft hover:text-ink active:text-ink"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  links,
  isActive,
}: {
  title: string;
  links: SidebarLink[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div>
      <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="space-y-0.5">
        {links.map((link) => {
          const Icon = ICONS[link.icon];
          const active = isActive(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-ink-secondary hover:bg-surface-hover active:bg-surface-hover hover:text-ink"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 truncate">{link.label}</span>
                {!!link.badge && (
                  <span className="rounded-full bg-status-overdue-fg px-1.5 py-0.5 text-xs font-semibold text-white">
                    {link.badge}
                  </span>
                )}
                {active && <ChevronRight className="size-3.5 shrink-0 text-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
