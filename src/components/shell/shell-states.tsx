import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function ShellLoading() { return <div role="status" aria-label="Cargando escenario" className="flex max-w-2xl flex-col gap-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>; }
export function ShellError({
  onRetry,
  title = "No se pudo cargar la pantalla",
  description = "Revise la conexión e intente nuevamente.",
}: {
  onRetry: () => void;
  title?: string;
  description?: string;
}) { return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>{description} <Button variant="link" className="h-auto min-h-0 p-0" onClick={onRetry}>Reintentar carga</Button></AlertDescription></Alert>; }
export function ShellForbidden() { return <Empty><EmptyHeader><EmptyTitle>Acceso no disponible</EmptyTitle><EmptyDescription>No tiene permiso para ver esta sección.</EmptyDescription></EmptyHeader></Empty>; }
export function ShellUnauthenticated() { return <Empty><Button variant="link" className="h-auto min-h-0 p-0" nativeButton={false} role="link" render={<a href="/login" />}>Iniciar sesión</Button></Empty>; }
