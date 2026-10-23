import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
export function ShellForbidden({ description = "No tiene permiso para ver esta sección." }: { description?: string }) { return <Empty><EmptyHeader><EmptyTitle>Acceso no disponible</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>; }
/** Empleado sin ningún rol asignado en Ambiente: el backend le niega hasta las lecturas, y no es un error. */
export function ShellNoRole({ logoutAction }: { logoutAction?: (formData: FormData) => void | Promise<void> }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Sin rol asignado</CardTitle>
          <CardDescription>
            Su usuario aún no tiene un rol asignado en Ambiente. Solicite a un administrador que se lo asigne y vuelva a ingresar.
          </CardDescription>
        </CardHeader>
        {logoutAction ? (
          <CardFooter className="justify-end">
            <form action={logoutAction}>
              <Button type="submit" variant="outline">Cerrar sesión</Button>
            </form>
          </CardFooter>
        ) : null}
      </Card>
    </main>
  );
}
export function ShellUnauthenticated() { return <Empty><Button variant="link" className="h-auto min-h-0 p-0" nativeButton={false} role="link" render={<a href="/login" />}>Iniciar sesión</Button></Empty>; }
