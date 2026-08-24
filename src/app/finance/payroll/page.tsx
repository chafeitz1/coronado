import { Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PayrollIndexPage() {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);

  return (
    <div className="space-y-4">
      <EmptyState icon={Users} message={dict.payroll.selectPrompt} />
    </div>
  );
}
