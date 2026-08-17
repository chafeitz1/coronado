import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SidebarClient, type SidebarLink } from "@/components/sidebar-client";

export async function Sidebar() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { count: openCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .neq("status", "done");

  const workLinks: SidebarLink[] = [
    { href: "/", label: "Inicio", icon: "home" },
    { href: "/work-orders", label: "Tareas", icon: "tasks", badge: openCount ?? 0 },
    { href: "/assets", label: "Activos", icon: "assets" },
  ];

  const manageLinks: SidebarLink[] =
    profile.role === "owner"
      ? [
          { href: "/vendors", label: "Proveedores", icon: "vendors" },
          { href: "/admin/staff", label: "Personal", icon: "staff" },
        ]
      : [];

  return (
    <SidebarClient
      profile={{ fullName: profile.full_name, role: profile.role, avatarUrl: profile.avatar_url }}
      workLinks={workLinks}
      manageLinks={manageLinks}
    />
  );
}
