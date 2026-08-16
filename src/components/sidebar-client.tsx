"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Wrench,
  Building2,
  RefreshCw,
  UserCog,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

const ICONS = {
  tasks: ClipboardList,
  assets: Wrench,
  vendors: Building2,
  pm: RefreshCw,
  staff: UserCog,
};

export type SidebarLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
};

export function SidebarClient({
  profile,
  workLinks,
  manageLinks,
}: {
  profile: { fullName: string; role: string };
  workLinks: SidebarLink[];
  manageLinks: SidebarLink[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-canvas px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary">
            C
          </span>
          <span className="font-semibold tracking-tight text-ink">Casa Coronado</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-hairline bg-canvas transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary">
              C
            </span>
            <span className="font-semibold tracking-tight text-ink">Casa Coronado</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-ink-muted hover:bg-surface-hover md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          <SidebarSection title="Trabajo" links={workLinks} isActive={isActive} onNavigate={() => setOpen(false)} />
          {manageLinks.length > 0 && (
            <SidebarSection
              title="Administrar"
              links={manageLinks}
              isActive={isActive}
              onNavigate={() => setOpen(false)}
            />
          )}
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <PushSubscribeButton />
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-hover">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {profile.fullName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{profile.fullName}</p>
              <p className="truncate text-xs text-ink-muted">{roleLabel(profile.role)}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Salir"
                className="rounded-md p-1.5 text-ink-faint hover:bg-canvas-soft hover:text-ink"
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
  onNavigate,
}: {
  title: string;
  links: SidebarLink[];
  isActive: (href: string) => boolean;
  onNavigate: () => void;
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
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 truncate">{link.label}</span>
                {!!link.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      active ? "bg-primary text-on-primary" : "bg-canvas-soft text-ink-muted"
                    }`}
                  >
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

function roleLabel(role: string) {
  if (role === "owner") return "Dueño";
  if (role === "family") return "Familia";
  return "Personal";
}
