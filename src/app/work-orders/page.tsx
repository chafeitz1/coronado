import { ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function WorkOrdersIndexPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  return <EmptyState icon={ClipboardList} message={dict.workOrders.selectPrompt} />;
}
