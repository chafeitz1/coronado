import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SidebarClient, type SidebarLink } from "@/components/sidebar-client";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function Sidebar() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const { count: openCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .neq("status", "done");

  const workLinks: SidebarLink[] = [
    { href: "/", label: dict.sidebar.home, icon: "home" },
    { href: "/work-orders", label: dict.sidebar.tasks, icon: "tasks", badge: openCount ?? 0 },
    { href: "/assets", label: dict.sidebar.assets, icon: "assets" },
    { href: "/directory", label: dict.sidebar.directory, icon: "directory" },
  ];

  return (
    <SidebarClient
      profile={{ fullName: profile.full_name, role: profile.role, avatarUrl: profile.avatar_url }}
      workLinks={workLinks}
      locale={profile.locale}
    />
  );
}
