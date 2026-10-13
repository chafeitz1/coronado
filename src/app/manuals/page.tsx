import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { EmptyState } from "@/components/ui/empty-state";
import { pageHeading } from "@/lib/ui";

export default async function ManualsPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  return (
    <div className="space-y-4">
      <h1 className={pageHeading}>{dict.manuals.title}</h1>
      <EmptyState icon={BookOpen} message={dict.manuals.comingSoon} />
    </div>
  );
}
