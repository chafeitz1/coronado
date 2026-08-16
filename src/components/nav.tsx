import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { buttonGhost } from "@/lib/ui";

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
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
              C
            </span>
            <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Casa Coronado
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <PushSubscribeButton />
            <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              {profile.full_name} · {roleLabel(profile.role)}
            </span>
            <form action={logout}>
              <button type="submit" className={buttonGhost}>
                Salir
              </button>
            </form>
          </div>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function roleLabel(role: string) {
  if (role === "owner") return "Dueño";
  if (role === "family") return "Familia";
  return "Personal";
}
