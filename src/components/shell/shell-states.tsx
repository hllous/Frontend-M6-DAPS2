import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function ShellLoading() { return <div aria-label="Cargando escenario" className="flex max-w-2xl flex-col gap-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>; }
export function ShellError({ onRetry }: { onRetry: () => void }) { return <Alert variant="destructive"><AlertTitle>No se pudo cargar el escenario</AlertTitle><AlertDescription>Verifique la conexión local y vuelva a intentarlo. <button className="underline" onClick={onRetry}>Reintentar carga</button></AlertDescription></Alert>; }
export function ShellForbidden() { return <Empty><EmptyHeader><EmptyTitle>Acceso no disponible</EmptyTitle><EmptyDescription>Su sesión no cuenta con la capacidad necesaria para este módulo.</EmptyDescription></EmptyHeader></Empty>; }
export function ShellUnauthenticated() { return <Empty><EmptyHeader><EmptyTitle>Inicie sesión para continuar</EmptyTitle><EmptyDescription>La aplicación operativa requiere una sesión activa.</EmptyDescription></EmptyHeader></Empty>; }
