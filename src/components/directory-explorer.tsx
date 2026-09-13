"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Building2, Users, User, Phone, Mail, Siren, ChevronRight, Plus, UserPlus, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Avatar } from "@/components/ui/avatar";
import { VendorPanel, VendorAvatar, type VendorPanelMode } from "@/components/vendor-panel";
import { PersonPanel } from "@/components/person-panel";
import { InvitePanel } from "@/components/invite-panel";
import { telHref, whatsAppHref } from "@/lib/phone";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate } from "@/lib/dates";
import { buttonPrimary, buttonSecondary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { VendorTrade, UserRole, NotificationEventType, Locale } from "@/lib/types/database";

export type VendorContact = {
  id: string;
  contact_name: string | null;
  role_label: string | null;
  phone: string | null;
  email: string | null;
};

export type VendorRow = {
  id: string;
  name: string;
  trades: VendorTrade[];
  notes: string | null;
  is_emergency: boolean;
  avatar_url: string | null;
  contacts: VendorContact[];
};

export type PersonRow = {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type NotifEvent = { key: NotificationEventType; label: string };

export type SalaryEntry = { salary: number; effective_date: string };

export type StaffDetails = {
  hire_date: string | null;
  birth_date: string | null;
  termination_date: string | null;
  id_document_path: string | null;
};

type DirectoryType = "all" | "vendors" | "people";

const actionButton = `flex-1 ${buttonSecondary}`;

export function DirectoryExplorer({
  vendors,
  people,
  currentUserId,
  isOwner,
  dict,
  locale,
  notifEvents,
  prefLookup,
  staffDetailsLookup,
  salaryHistoryLookup,
}: {
  vendors: VendorRow[];
  people: PersonRow[];
  currentUserId: string;
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  notifEvents: NotifEvent[];
  prefLookup: Record<string, boolean>;
  staffDetailsLookup: Record<string, StaffDetails>;
  salaryHistoryLookup: Record<string, SalaryEntry[]>;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DirectoryType>("all");
  const [activeTrade, setActiveTrade] = useState<VendorTrade | null>(null);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const searchParams = useSearchParams();
  // Lazy initializer so a `?vendor=<id>` deep link (from the command
  // palette or an asset's preferred-vendor link) opens the panel on first
  // render, without an effect racing the initial paint.
  const [panel, setPanel] = useState<{ mode: VendorPanelMode; vendor: VendorRow | null } | null>(() => {
    const vendorId = searchParams.get("vendor");
    if (!vendorId) return null;
    const match = vendors.find((v) => v.id === vendorId);
    if (!match) return null;
    return { mode: searchParams.get("edit") === "1" ? "edit" : "view", vendor: match };
  });
  // Stores just the id, not the row itself — the row is looked up fresh
  // from `people` on every render so an edit (avatar, phone, role...)
  // shows up in the open panel immediately after the server revalidates,
  // instead of the panel being stuck on the snapshot from when it opened.
  const [personPanelId, setPersonPanelId] = useState<string | null>(null);
  const personPanel = personPanelId ? (people.find((p) => p.id === personPanelId) ?? null) : null;

  const q = search.trim().toLowerCase();

  const searchedVendors = useMemo(
    () =>
      vendors.filter(
        (v) =>
          !q ||
          v.name.toLowerCase().includes(q) ||
          v.contacts.some((c) => c.contact_name?.toLowerCase().includes(q))
      ),
    [vendors, q]
  );
  const searchedPeople = useMemo(
    () => people.filter((p) => !q || p.full_name.toLowerCase().includes(q)),
    [people, q]
  );

  const emergencyCount = useMemo(() => searchedVendors.filter((v) => v.is_emergency).length, [searchedVendors]);

  const emergencyFilteredVendors = useMemo(
    () => (emergencyOnly ? searchedVendors.filter((v) => v.is_emergency) : searchedVendors),
    [searchedVendors, emergencyOnly]
  );

  const tradeCounts = useMemo(() => {
    const counts = new Map<VendorTrade, number>();
    for (const v of emergencyFilteredVendors) for (const t of v.trades) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [emergencyFilteredVendors]);

  const existingTrades = useMemo(
    () => [...new Set(vendors.flatMap((v) => v.trades))].sort((a, b) => a.localeCompare(b)),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    if (type === "people") return [];
    if (!activeTrade) return emergencyFilteredVendors;
    return emergencyFilteredVendors.filter((v) => v.trades.includes(activeTrade));
  }, [emergencyFilteredVendors, type, activeTrade]);

  const peopleByRole = useMemo(() => {
    if (type === "vendors") return [];
    const groups: { role: UserRole; label: string; members: PersonRow[] }[] = [
      { role: "owner", label: dict.roles.owner, members: [] },
      { role: "resident", label: dict.roles.resident, members: [] },
      { role: "staff", label: dict.roles.staff, members: [] },
    ];
    for (const p of searchedPeople) {
      groups.find((g) => g.role === p.role)?.members.push(p);
    }
    for (const g of groups) g.members.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return groups.filter((g) => g.members.length > 0);
  }, [searchedPeople, type, dict]);

  const showVendors = type !== "people";
  const showPeople = type !== "vendors" && !emergencyOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageHeading}>{dict.directory.title}</h1>
          <p className={mutedText}>{format(dict.directory.subtitleCount, { count: vendors.length + people.length })}</p>
        </div>
        {isOwner && (
          <AddMenu
            dict={dict}
            onAddVendor={() => setPanel({ mode: "create", vendor: null })}
            onAddPerson={() => setInviteOpen(true)}
          />
        )}
      </div>

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
        <Pill
          label={`${dict.directory.filterAll} · ${searchedVendors.length + searchedPeople.length}`}
          active={type === "all"}
          onClick={() => setType("all")}
        />
        <Pill
          label={`${dict.directory.filterVendors} · ${searchedVendors.length}`}
          active={type === "vendors"}
          onClick={() => setType("vendors")}
        />
        <Pill
          label={`${dict.directory.filterPeople} · ${searchedPeople.length}`}
          active={type === "people"}
          onClick={() => setType("people")}
        />
        {emergencyCount > 0 && (
          <>
            <span className="mx-1 hidden w-px self-stretch bg-hairline sm:block" aria-hidden />
            <button
              type="button"
              onClick={() => {
                setEmergencyOnly((e) => !e);
                if (type === "people") setType("all");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                emergencyOnly
                  ? "border-status-overdue-fg bg-status-overdue-fg text-white"
                  : "border-status-overdue-fg/40 bg-status-overdue-bg text-status-overdue-fg hover:bg-status-overdue-fg/15 active:bg-status-overdue-fg/15"
              }`}
            >
              <Siren className="size-3.5" /> {dict.directory.filterEmergency} · {emergencyCount}
            </button>
          </>
        )}
      </div>

      {showVendors && (
        <section className="space-y-3">
          <h2 className={sectionHeading}>
            {dict.directory.vendorsHeading} <span className="text-ink-faint">· {filteredVendors.length}</span>
          </h2>

          {tradeCounts.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              <Pill
                label={dict.directory.filterAll}
                active={!activeTrade}
                onClick={() => setActiveTrade(null)}
                small
                noShrink
              />
              {tradeCounts.map(([trade, count]) => (
                <Pill
                  key={trade}
                  label={`${trade} · ${count}`}
                  active={activeTrade === trade}
                  onClick={() => setActiveTrade(activeTrade === trade ? null : trade)}
                  small
                  noShrink
                />
              ))}
            </div>
          )}

          {filteredVendors.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  dict={dict}
                  onSelect={() => setPanel({ mode: "view", vendor })}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              message={q || activeTrade || emergencyOnly ? dict.directory.emptyVendorsSearch : dict.directory.emptyVendors}
            />
          )}
        </section>
      )}

      {showPeople && (
        <section className="space-y-3">
          <h2 className={sectionHeading}>
            {dict.directory.peopleHeading} <span className="text-ink-faint">· {searchedPeople.length}</span>
          </h2>

          {peopleByRole.length > 0 ? (
            <div className="space-y-4">
              {peopleByRole.map((group) => (
                <div key={group.role} className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {group.label} <span className="text-ink-faint">· {group.members.length}</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.members.map((person) => (
                      <PersonCard
                        key={person.id}
                        person={person}
                        isSelf={person.id === currentUserId}
                        dict={dict}
                        locale={locale}
                        hireDate={staffDetailsLookup[person.id]?.hire_date ?? null}
                        onSelect={() => setPersonPanelId(person.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} message={dict.directory.emptyPeopleSearch} />
          )}
        </section>
      )}

      {panel && (
        <VendorPanel
          key={panel.mode === "create" ? "create" : `${panel.mode}-${panel.vendor!.id}`}
          mode={panel.mode}
          vendor={panel.vendor}
          dict={dict}
          isOwner={isOwner}
          existingTrades={existingTrades}
          onClose={() => setPanel(null)}
        />
      )}

      {personPanel && (
        <PersonPanel
          key={personPanel.id}
          person={personPanel}
          isSelf={personPanel.id === currentUserId}
          isOwner={isOwner}
          dict={dict}
          locale={locale}
          events={notifEvents}
          prefLookup={prefLookup}
          staffDetails={
            staffDetailsLookup[personPanel.id] ?? {
              hire_date: null,
              birth_date: null,
              termination_date: null,
              id_document_path: null,
            }
          }
          salaryHistory={salaryHistoryLookup[personPanel.id] ?? []}
          onClose={() => setPersonPanelId(null)}
        />
      )}

      {isOwner && inviteOpen && <InvitePanel dict={dict} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function AddMenu({
  dict,
  onAddVendor,
  onAddPerson,
}: {
  dict: Dictionary;
  onAddVendor: () => void;
  onAddPerson: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonPrimary}>
        <Plus className="size-4" /> {dict.directory.addButton}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-48 overflow-hidden rounded-lg border border-hairline bg-surface p-1 shadow-[var(--shadow-soft)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAddVendor();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
          >
            <Building2 className="size-4" /> {dict.directory.addVendorOption}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAddPerson();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
          >
            <UserPlus className="size-4" /> {dict.directory.addPersonOption}
          </button>
        </div>
      )}
    </div>
  );
}

function VendorCard({
  vendor,
  dict,
  onSelect,
}: {
  vendor: VendorRow;
  dict: Dictionary;
  onSelect: () => void;
}) {
  const primaryContact = vendor.contacts[0] ?? null;
  return (
    <div className={`flex h-full flex-col p-4 ${card}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <VendorAvatar avatarUrl={vendor.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{vendor.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {vendor.is_emergency && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-overdue-fg px-2.5 py-0.5 text-xs font-semibold text-white">
                <Siren className="size-3" /> {dict.directory.emergencyBadge}
              </span>
            )}
            {vendor.trades.length > 0 ? (
              vendor.trades.map((t) => (
                <span key={t} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">{dict.directory.noSpecialty}</span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-2 size-4 shrink-0 text-ink-faint" />
      </button>

      {primaryContact ? (
        <div className="mt-3 space-y-1.5 pl-14 text-sm text-ink-secondary">
          {(primaryContact.contact_name || primaryContact.role_label) && (
            <p className="flex items-center gap-2">
              <User className="size-3.5 shrink-0 text-ink-faint" />
              {[primaryContact.contact_name, primaryContact.role_label].filter(Boolean).join(" · ")}
            </p>
          )}
          {primaryContact.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-ink-faint" /> {primaryContact.phone}
            </p>
          )}
          {primaryContact.email && (
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-ink-faint" /> {primaryContact.email}
            </p>
          )}
          {vendor.contacts.length > 1 && (
            <p className="text-xs text-ink-faint">{format(dict.directory.moreContacts, { count: vendor.contacts.length - 1 })}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 pl-14 text-sm text-ink-faint">{dict.directory.noContacts}</p>
      )}

      {vendor.notes && <p className="mt-3 pl-14 text-sm text-ink-muted">{vendor.notes}</p>}

      {primaryContact && (primaryContact.phone || primaryContact.email) && (
        <div className="mt-auto flex gap-2 pt-3">
          {primaryContact.phone && (
            <a href={telHref(primaryContact.phone)} className={actionButton}>
              <Phone className="size-3.5" /> {dict.vendorDetail.call}
            </a>
          )}
          {primaryContact.phone && (
            <a
              href={whatsAppHref(primaryContact.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={actionButton}
            >
              <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
            </a>
          )}
          {primaryContact.email && (
            <a href={`mailto:${primaryContact.email}`} className={actionButton}>
              <Mail className="size-3.5" /> {dict.vendorDetail.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PersonCard({
  person,
  isSelf,
  dict,
  locale,
  hireDate,
  onSelect,
}: {
  person: PersonRow;
  isSelf: boolean;
  dict: Dictionary;
  locale: Locale;
  hireDate: string | null;
  onSelect: () => void;
}) {
  const roleLabel =
    person.role === "staff"
      ? dict.directory.staffOption
      : person.role === "resident"
        ? dict.directory.residentOption
        : dict.directory.ownerOption;

  return (
    <div className={`flex h-full flex-col p-4 ${card}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 text-left">
        <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {person.full_name}
            {isSelf && <span className={`ml-1.5 text-sm font-normal ${mutedText}`}>{dict.directory.you}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
              {roleLabel}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-ink-faint" />
      </button>

      {(hireDate || person.phone) && (
        <div className="mt-3 space-y-1.5 pl-14 text-sm text-ink-secondary">
          {person.role === "staff" && hireDate && (
            <p className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-ink-faint" />
              {format(dict.directory.sinceLabel, { date: formatLongDate(hireDate, locale) })}
            </p>
          )}
          {person.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-ink-faint" /> {person.phone}
            </p>
          )}
        </div>
      )}

      {person.phone && (
        <div className="mt-auto flex gap-2 pt-3">
          <a href={telHref(person.phone)} className={actionButton}>
            <Phone className="size-3.5" /> {dict.vendorDetail.call}
          </a>
          <a href={whatsAppHref(person.phone)} target="_blank" rel="noopener noreferrer" className={actionButton}>
            <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
          </a>
        </div>
      )}
    </div>
  );
}

