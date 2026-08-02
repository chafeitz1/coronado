import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

export async function Nav() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const links = [
    { href: "/", label: "Tareas" },
    { href: "/assets", label: "Activos" },
    ...(profile.role === "owner"
      ? [
          { href: "/vendors", label: "Proveedores" },
          { href: "/pm-schedules", label: "Preventivo" },
          { href: "/admin/staff", label: "Personal" },
        ]
      : []),
  ];

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <span className="font-semibold">Casa Coronado</span>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <PushSubscribeButton />
          <span className="text-black/60 dark:text-white/60">
            {profile.full_name} · {roleLabel(profile.role)}
          </span>
          <form action={logout}>
            <button type="submit" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function roleLabel(role: string) {
  if (role === "owner") return "Dueño";
  if (role === "family") return "Familia";
  return "Personal";
}
