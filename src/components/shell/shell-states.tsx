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
export function ShellForbidden({ description = "Su sesión no cuenta con la capacidad necesaria para este módulo." }: { description?: string }) { return <Empty><EmptyHeader><EmptyTitle>Acceso no disponible</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>; }
/** Empleado sin ningún rol asignado en Ambiente: el backend le niega hasta las lecturas, y no es un error. */
export function ShellNoRole() { return <Empty><EmptyHeader><EmptyTitle>Sin rol asignado</EmptyTitle><EmptyDescription>Su usuario todavía no tiene un rol asignado en Ambiente. Solicite a un administrador que se lo asigne y vuelva a ingresar.</EmptyDescription></EmptyHeader></Empty>; }
export function ShellUnauthenticated() { return <Empty><EmptyHeader><EmptyTitle>Inicie sesión para continuar</EmptyTitle><EmptyDescription>La aplicación operativa requiere una sesión activa. <Button variant="link" className="h-auto min-h-0 p-0" nativeButton={false} role="link" render={<a href="/login" />}>Volver a iniciar sesión</Button></EmptyDescription></EmptyHeader></Empty>; }
