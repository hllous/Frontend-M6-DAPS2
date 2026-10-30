import Link from "next/link";
import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

/** Marco de la sección pública: sin shell del personal, sin navegación ni pulso de sesión. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-canvas)]">
      <header className="border-b bg-[var(--color-institutional)] text-[var(--color-on-institutional)]">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link href="/consulta" className="flex min-h-10 flex-col justify-center rounded-md leading-tight">
            <span className="text-xs text-[var(--color-on-institutional-secondary)]">Ambiente e Higiene</span>
            <span className="font-semibold">Consulta ciudadana</span>
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", className: "text-[var(--color-on-institutional)] hover:bg-white/10 hover:text-[var(--color-on-institutional)]" })}
          >
            Ingreso del personal
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Entorno de demostración: los datos que ves no son los del servicio municipal real.
          </AlertDescription>
        </Alert>
        {children}
      </main>
    </div>
  );
}
