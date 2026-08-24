"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  User,
  Phone,
  Mail,
  Siren,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PrefToggle } from "@/components/pref-toggle";
import { Avatar } from "@/components/ui/avatar";
import { VendorPanel, type VendorPanelMode } from "@/components/vendor-panel";
import { inviteMember } from "@/app/actions/admin";
import { telHref, whatsAppHref } from "@/lib/phone";
import { type Dictionary } from "@/lib/i18n/dictionaries";
import { buttonSecondary, card, input, mutedText, sectionHeading } from "@/lib/ui";
import type { VendorTrade, UserRole, NotificationEventType } from "@/lib/types/database";

export type VendorRow = {
  id: string;
  name: string;
  contact_name: string | null;
  trades: VendorTrade[];
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_emergency: boolean;
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

const actionButton = `flex-1 ${buttonSecondary}`;

export function DirectoryExplorer({
  vendors,
  people,
  currentUserId,
  isOwner,
  dict,
  notifEvents,
  prefLookup,
}: {
  vendors: VendorRow[];
  people: PersonRow[];
  currentUserId: string;
  isOwner: boolean;
  dict: Dictionary;
  notifEvents: NotifEvent[];
  prefLookup: Record<string, boolean>;
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

  const q = search.trim().toLowerCase();

  const searchedVendors = useMemo(
    () => vendors.filter((v) => !q || v.name.toLowerCase().includes(q) || v.contact_name?.toLowerCase().includes(q)),
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
      { role: "family", label: dict.roles.family, members: [] },
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
                  : "border-status-overdue-fg/40 bg-status-overdue-bg text-status-overdue-fg hover:bg-status-overdue-fg/15"
              }`}
            >
              <Siren className="size-3.5" /> {dict.directory.filterEmergency} · {emergencyCount}
            </button>
          </>
        )}
      </div>

      {showVendors && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionHeading}>
              {dict.directory.vendorsHeading} <span className="text-ink-faint">· {filteredVendors.length}</span>
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={() => setPanel({ mode: "create", vendor: null })}
                className="text-xs font-medium text-primary hover:underline"
              >
                + {dict.directory.newVendor}
              </button>
            )}
          </div>

          {tradeCounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Pill label={dict.directory.filterAll} active={!activeTrade} onClick={() => setActiveTrade(null)} small />
              {tradeCounts.map(([trade, count]) => (
                <Pill
                  key={trade}
                  label={`${trade} · ${count}`}
                  active={activeTrade === trade}
                  onClick={() => setActiveTrade(activeTrade === trade ? null : trade)}
                  small
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionHeading}>
              {dict.directory.peopleHeading} <span className="text-ink-faint">· {searchedPeople.length}</span>
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
                        isOwner={isOwner}
                        dict={dict}
                        events={notifEvents}
                        prefLookup={prefLookup}
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
  return (
    <div className={`p-4 ${card}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Building2 className="size-5" strokeWidth={2} />
        </span>
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

      {(vendor.contact_name || vendor.phone || vendor.email) && (
        <div className="mt-3 space-y-1.5 text-sm text-ink-secondary">
          {vendor.contact_name && (
            <p className="flex items-center gap-2">
              <User className="size-3.5 shrink-0 text-ink-faint" /> {vendor.contact_name}
            </p>
          )}
          {vendor.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-ink-faint" /> {vendor.phone}
            </p>
          )}
          {vendor.email && (
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-ink-faint" /> {vendor.email}
            </p>
          )}
        </div>
      )}

      {vendor.notes && <p className="mt-3 text-sm text-ink-muted">{vendor.notes}</p>}

      {(vendor.phone || vendor.email) && (
        <div className="mt-3 flex gap-2">
          {vendor.phone && (
            <a href={telHref(vendor.phone)} className={actionButton}>
              <Phone className="size-3.5" /> {dict.vendorDetail.call}
            </a>
          )}
          {vendor.phone && (
            <a href={whatsAppHref(vendor.phone)} target="_blank" rel="noopener noreferrer" className={actionButton}>
              <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
            </a>
          )}
          {vendor.email && (
            <a href={`mailto:${vendor.email}`} className={actionButton}>
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
    <div className={`p-4 ${card}`}>
      <div className="flex items-start gap-3">
        <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {person.full_name}
            {isSelf && <span className={`ml-1.5 text-sm font-normal ${mutedText}`}>{dict.directory.you}</span>}
          </p>
        </div>
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

      {person.phone && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
          <Phone className="size-3.5 shrink-0 text-ink-faint" /> {person.phone}
        </p>
      )}

      {person.phone && (
        <div className="mt-3 flex gap-2">
          <a href={telHref(person.phone)} className={actionButton}>
            <Phone className="size-3.5" /> {dict.vendorDetail.call}
          </a>
          <a href={whatsAppHref(person.phone)} target="_blank" rel="noopener noreferrer" className={actionButton}>
            <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
          </a>
        </div>
      )}

      {canExpand && expanded && (
        <div className="mt-3 overflow-x-auto border-t border-hairline pt-3">
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
