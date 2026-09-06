import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function ShellLoading() { return <div role="status" aria-label="Cargando escenario" className="flex max-w-2xl flex-col gap-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>; }
export function ShellError({
  onRetry,
  title = "No se pudo cargar el escenario",
  description = "Verifique la conexión local y vuelva a intentarlo.",
}: {
  onRetry: () => void;
  title?: string;
  description?: string;
}) { return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>{description} <button className="underline" onClick={onRetry}>Reintentar carga</button></AlertDescription></Alert>; }
export function ShellForbidden() { return <Empty><EmptyHeader><EmptyTitle>Acceso no disponible</EmptyTitle><EmptyDescription>Su sesión no cuenta con la capacidad necesaria para este módulo.</EmptyDescription></EmptyHeader></Empty>; }
export function ShellUnauthenticated() { return <Empty><EmptyHeader><EmptyTitle>Inicie sesión para continuar</EmptyTitle><EmptyDescription>La aplicación operativa requiere una sesión activa.</EmptyDescription></EmptyHeader></Empty>; }
