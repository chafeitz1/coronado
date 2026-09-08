import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SidebarClient, type SidebarLink } from "@/components/sidebar-client";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function Sidebar() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  // Same "overdue" definition as everywhere else: still open (not done or
  // skipped) and past its due date.
  const { count: overdueCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(done,skipped)")
    .lt("due_date", today);

  const workLinks: SidebarLink[] = [
    { href: "/", label: dict.sidebar.home, icon: "home" },
    { href: "/work-orders", label: dict.sidebar.tasks, icon: "tasks", badge: overdueCount ?? 0 },
    { href: "/purchases", label: dict.sidebar.purchases, icon: "purchases" },
    { href: "/assets", label: dict.sidebar.assets, icon: "assets" },
    { href: "/directory", label: dict.sidebar.directory, icon: "directory" },
  ];

  if (profile.role === "owner") {
    workLinks.push({ href: "/finance/payroll", label: dict.sidebar.finance, icon: "finance" });
  }

  return (
    <SidebarClient
      profile={{ fullName: profile.full_name, role: profile.role, avatarUrl: profile.avatar_url }}
      workLinks={workLinks}
      locale={profile.locale}
    />
  );
}
