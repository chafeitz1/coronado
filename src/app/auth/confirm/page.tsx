import { redirect } from "next/navigation";
import { confirmAccess } from "@/app/actions/auth";
import { buttonPrimary, card, mutedText, pageHeading } from "@/lib/ui";

// Where a magic-link / invite email actually lands. This is deliberately a
// page with a button the person has to click — not a route that verifies on
// GET — because email security scanners (Outlook/Hotmail Safe Links, most
// notably) fetch every link in an incoming email to scan it, which would
// otherwise burn the single-use token before the person ever opens their
// inbox. A scanner hitting this page just renders an inert button; only a
// real click calls confirmAccess and consumes the token.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  if (!tokenHash || !type) redirect("/login?error=invalid_link");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form action={confirmAccess} className={`w-full max-w-sm space-y-4 p-8 text-center ${card}`}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        {next && <input type="hidden" name="next" value={next} />}

        <h1 className={pageHeading}>Confirmar acceso</h1>
        <p className={mutedText}>Tocá el botón para entrar a Casa Coronado.</p>

        <button type="submit" className={`w-full ${buttonPrimary}`}>
          Entrar
        </button>
      </form>
    </div>
  );
}
