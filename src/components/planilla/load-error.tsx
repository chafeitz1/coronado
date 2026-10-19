import { Button } from "@/components/payroll-ui/button";

/** Mensaje visible cuando una pestaña no pudo cargar (en vez de quedarse
 *  en "Cargando…" para siempre). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">No se pudo cargar esta sección.</p>
      <p className="break-words text-xs text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
