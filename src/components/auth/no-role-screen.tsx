"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { finishSessionLogout } from "@/lib/session-client";

export function NoRoleScreen({ identity }: { identity: string }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/session/logout", {
        method: "POST",
        headers: SESSION_MUTATION_HEADERS,
        body: "{}",
      });
      if (!response.ok) throw new Error("logout failed");
      finishSessionLogout();
    } catch {
      setError("No se pudo cerrar la sesión. Intente nuevamente.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-canvas)] p-4 sm:p-6">
      <Card className="w-full max-w-[520px] gap-0 p-4 sm:p-8">
        <CardHeader className="gap-2 px-0">
          <CardTitle role="heading" aria-level={1} className="text-[28px] leading-[34px]">Sin rol asignado</CardTitle>
          <CardDescription className="text-base leading-6">
            Su cuenta ya inició sesión, pero todavía no tiene un rol de M6 asignado en Ambiente. Solicite a un administrador de M6 que le asigne un rol para poder acceder.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-5">
          <div className="mt-5 flex flex-col gap-1">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Cuenta activa</p>
            <p className="font-semibold text-[var(--color-text)]">{identity}</p>
          </div>
          {error ? <Alert className="mt-4" variant="danger"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="mt-6 flex justify-end">
            <Button type="button" variant="outline" onClick={() => void logout()} disabled={pending}>
              {pending ? <><Spinner aria-hidden="true" /><span>Cerrando sesión…</span></> : "Cerrar sesión"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
