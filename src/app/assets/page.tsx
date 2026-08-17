import { Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessBanner } from "@/components/ui/success-banner";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AssetsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const { deleted } = await searchParams;

  return (
    <div className="space-y-4">
      {deleted && <SuccessBanner message={dict.assets.deletedBanner} />}
      <EmptyState icon={Wrench} message={dict.assets.selectPrompt} />
    </div>
  );
}
