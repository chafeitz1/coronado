"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Users,
  Phone,
  Mail,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PrefToggle } from "@/components/pref-toggle";
import { Avatar } from "@/components/ui/avatar";
import { inviteMember } from "@/app/actions/admin";
import { telHref, whatsAppHref } from "@/lib/phone";
import { getTradeLabels } from "@/lib/vendor-trades";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { input, listCard, mutedText, sectionHeading, card } from "@/lib/ui";
import type { Locale, VendorTrade, UserRole, NotificationEventType } from "@/lib/types/database";

type VendorRow = {
  id: string;
  name: string;
  contact_name: string | null;
  trades: VendorTrade[];
  phone: string | null;
  email: string | null;
};

type PersonRow = {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
};

type NotifEvent = { key: NotificationEventType; label: string };

type DirectoryType = "all" | "vendors" | "people";

export function DirectoryExplorer({
  vendors,
  people,
  currentUserId,
  isOwner,
  dict,
  locale,
  notifEvents,
  prefLookup,
  ownerId,
  ownerNoteEmailEnabled,
}: {
  vendors: VendorRow[];
  people: PersonRow[];
  currentUserId: string;
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  notifEvents: NotifEvent[];
  prefLookup: Record<string, boolean>;
  ownerId: string;
  ownerNoteEmailEnabled: boolean;
}) {
  const tradeLabels = getTradeLabels(locale);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DirectoryType>("all");
  const [activeTrade, setActiveTrade] = useState<VendorTrade | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const q = search.trim().toLowerCase();

  const tradeCounts = useMemo(() => {
    const counts = new Map<VendorTrade, number>();
    for (const v of vendors) for (const t of v.trades) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => tradeLabels[a[0]].localeCompare(tradeLabels[b[0]]));
  }, [vendors, tradeLabels]);

  const filteredVendors = useMemo(() => {
    if (type === "people") return [];
    return vendors.filter((v) => {
      if (activeTrade && !v.trades.includes(activeTrade)) return false;
      if (q && !v.name.toLowerCase().includes(q) && !v.contact_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vendors, type, activeTrade, q]);

  const peopleByRole = useMemo(() => {
    if (type === "vendors") return [];
    const filtered = people.filter((p) => !q || p.full_name.toLowerCase().includes(q));
    const groups: { role: UserRole; label: string; members: PersonRow[] }[] = [
      { role: "owner", label: dict.roles.owner, members: [] },
      { role: "family", label: dict.roles.family, members: [] },
      { role: "staff", label: dict.roles.staff, members: [] },
    ];
    for (const p of filtered) {
      groups.find((g) => g.role === p.role)?.members.push(p);
    }
    for (const g of groups) g.members.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return groups.filter((g) => g.members.length > 0);
  }, [people, type, q, dict]);

  const peopleCount = peopleByRole.reduce((sum, g) => sum + g.members.length, 0);

  const showVendors = type !== "people";
  const showPeople = type !== "vendors";

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.directory.searchPlaceholder}
          className={`${input} pl-9`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill label={dict.directory.filterAll} active={type === "all"} onClick={() => setType("all")} />
        <Pill label={dict.directory.filterVendors} active={type === "vendors"} onClick={() => setType("vendors")} />
        <Pill label={dict.directory.filterPeople} active={type === "people"} onClick={() => setType("people")} />
      </div>

      {isOwner && (
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <PrefToggle
            userId={ownerId}
            eventType="note_flagged"
            channel="email"
            defaultEnabled={ownerNoteEmailEnabled}
          />
          <Bell className="size-3.5" /> {dict.directory.notifyMe}
        </label>
      )}

      {showVendors && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionHeading}>
              {dict.directory.vendorsHeading} <span className="text-ink-faint">· {filteredVendors.length}</span>
            </h2>
            {isOwner && (
              <Link href="/vendors/new" className="text-xs font-medium text-primary hover:underline">
                + {dict.directory.newVendor}
              </Link>
            )}
          </div>

          {tradeCounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Pill label={dict.directory.filterAll} active={!activeTrade} onClick={() => setActiveTrade(null)} small />
              {tradeCounts.map(([trade, count]) => (
                <Pill
                  key={trade}
                  label={`${tradeLabels[trade]} · ${count}`}
                  active={activeTrade === trade}
                  onClick={() => setActiveTrade(activeTrade === trade ? null : trade)}
                  small
                />
              ))}
            </div>
          )}

          {filteredVendors.length > 0 ? (
            <ul className={listCard}>
              {filteredVendors.map((vendor) => (
                <li key={vendor.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Building2 className="size-4" strokeWidth={2} />
                  </span>
                  <Link href={`/vendors/${vendor.id}`} className="min-w-40 flex-1 hover:underline">
                    <p className="truncate font-medium text-ink">{vendor.name}</p>
                    <p className={`${mutedText} truncate`}>
                      {vendor.contact_name ? `${vendor.contact_name} · ` : ""}
                      {vendor.trades.length > 0
                        ? vendor.trades.map((t) => tradeLabels[t]).join(", ")
                        : dict.directory.noSpecialty}
                    </p>
                    {(vendor.phone || vendor.email) && (
                      <p className="truncate text-xs text-ink-faint">
                        {[vendor.phone, vendor.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </Link>
                  <ContactIcons
                    phone={vendor.phone}
                    email={vendor.email}
                    name={vendor.name}
                    dict={dict}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Building2}
              message={q || activeTrade ? dict.directory.emptyVendorsSearch : dict.directory.emptyVendors}
            />
          )}
        </section>
      )}

      {showPeople && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionHeading}>
              {dict.directory.peopleHeading} <span className="text-ink-faint">· {peopleCount}</span>
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={() => setInviteOpen((o) => !o)}
                className="text-xs font-medium text-primary hover:underline"
              >
                + {dict.directory.inviteButton}
              </button>
            )}
          </div>

          {isOwner && inviteOpen && (
            <form action={inviteMember} className={`flex flex-wrap items-end gap-3 p-4 ${card}`}>
              <Field label={dict.directory.nameLabel}>
                <input name="full_name" required className={input} />
              </Field>
              <Field label={dict.directory.emailLabel}>
                <input type="email" name="email" required className={input} />
              </Field>
              <Field label={dict.directory.roleLabel}>
                <select name="role" defaultValue="staff" className={input}>
                  <option value="staff">{dict.directory.staffOption}</option>
                  <option value="family">{dict.directory.familyOption}</option>
                </select>
              </Field>
              <SubmitButton
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-active disabled:pointer-events-none disabled:opacity-50"
                pendingLabel={dict.directory.sendInvitePending}
              >
                {dict.directory.sendInvite}
              </SubmitButton>
            </form>
          )}

          {peopleByRole.length > 0 ? (
            <div className="space-y-4">
              {peopleByRole.map((group) => (
                <div key={group.role} className="space-y-1.5">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {group.label} <span className="text-ink-faint">· {group.members.length}</span>
                  </h3>
                  <ul className={listCard}>
                    {group.members.map((person) => (
                      <PersonRowItem
                        key={person.id}
                        person={person}
                        isSelf={person.id === currentUserId}
                        isOwner={isOwner}
                        dict={dict}
                        events={notifEvents}
                        prefLookup={prefLookup}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} message={dict.directory.emptyPeopleSearch} />
          )}
        </section>
      )}
    </div>
  );
}

function PersonRowItem({
  person,
  isSelf,
  isOwner,
  dict,
  events,
  prefLookup,
}: {
  person: PersonRow;
  isSelf: boolean;
  isOwner: boolean;
  dict: Dictionary;
  events: NotifEvent[];
  prefLookup: Record<string, boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = isOwner && person.role === "staff" && !isSelf;

  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} />
        <div className="min-w-40 flex-1">
          <p className="truncate font-medium text-ink">
            {person.full_name}
            {isSelf && <span className={`ml-1 font-normal ${mutedText}`}>{dict.directory.you}</span>}
          </p>
          {person.phone && <p className="truncate text-xs text-ink-faint">{person.phone}</p>}
        </div>
        <ContactIcons phone={person.phone} email={null} name={person.full_name} dict={dict} />
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-primary"
            aria-label={dict.directory.notifications}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>

      {canExpand && expanded && (
        <div className="overflow-x-auto border-t border-hairline bg-canvas-soft px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint">
                <th className="pb-2 font-normal">{dict.directory.eventHeader}</th>
                <th className="pb-2 font-normal">{dict.directory.pushHeader}</th>
                <th className="pb-2 font-normal">{dict.directory.emailHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {events.map((event) => (
                <tr key={event.key}>
                  <td className="py-2 text-ink-secondary">{event.label}</td>
                  <td className="py-2">
                    <PrefToggle
                      userId={person.id}
                      eventType={event.key}
                      channel="push"
                      defaultEnabled={prefLookup[`${person.id}:${event.key}:push`] ?? true}
                    />
                  </td>
                  <td className="py-2">
                    <PrefToggle
                      userId={person.id}
                      eventType={event.key}
                      channel="email"
                      defaultEnabled={prefLookup[`${person.id}:${event.key}:email`] ?? true}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}

function ContactIcons({
  phone,
  email,
  name,
  dict,
}: {
  phone: string | null;
  email: string | null;
  name: string;
  dict: Dictionary;
}) {
  if (!phone && !email) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {phone && (
        <>
          <a
            href={telHref(phone)}
            aria-label={format(dict.directory.call, { name })}
            className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <Phone className="size-4" />
          </a>
          <a
            href={whatsAppHref(phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={format(dict.directory.whatsapp, { name })}
            className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-[#25D366]"
          >
            <WhatsAppIcon className="size-4" />
          </a>
        </>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          aria-label={format(dict.directory.email, { name })}
          className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-primary"
        >
          <Mail className="size-4" />
        </a>
      )}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
  small,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border font-medium transition-colors ${
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline bg-surface text-ink-muted hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
