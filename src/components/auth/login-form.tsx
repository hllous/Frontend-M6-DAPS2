"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { AuthMode } from "@/lib/session";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { DEMO_IDENTITIES } from "@/lib/demo-identities";
import type { OperationalScenario, ScenarioId } from "@/lib/scenarios";

export function LoginForm({
  scenarios,
  authMode,
  redirectTo,
  sessionExpired = false,
}: {
  scenarios: OperationalScenario[];
  authMode: AuthMode;
  redirectTo: string;
  /** La sesión se cayó sola: se avisa y, al ingresar, se vuelve a la pantalla de origen (`redirectTo`). */
  sessionExpired?: boolean;
}) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(scenarios[0]?.id ?? "office-duty-queue");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; denied: boolean; invalidCredentials?: boolean }>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    setPending(true);

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: SESSION_MUTATION_HEADERS,
        body: JSON.stringify(authMode === "real-m1" ? { email, password } : { scenarioId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError({
          message: body.message ?? "No se pudo ingresar. Intente nuevamente.",
          denied: response.status === 403,
          invalidCredentials: authMode === "real-m1" && response.status === 401,
        });
        setPassword("");
        return;
      }
      window.location.assign(redirectTo);
    } catch {
      setError({ message: "No se pudo ingresar. Revise la conexión e intente nuevamente.", denied: false });
      setPassword("");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-canvas)] p-4 sm:p-6">
      <Card className="w-full max-w-[520px] gap-0 p-4 sm:p-8">
        <CardHeader className="gap-0 px-0">
          <p className="mb-5 text-sm font-semibold tracking-wide text-[var(--color-institutional)]">Ambiente e Higiene</p>
          <h1 id="login-title" className="max-w-[16ch] text-[28px] leading-[34px]">
            Ingresar
          </h1>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={submit} aria-busy={pending}>
              <FieldGroup>
                {sessionExpired ? (
                  <Alert role="alert">
                    <AlertTitle>Sesión terminada</AlertTitle>
                    <AlertDescription>Su sesión terminó. Vuelva a ingresar.</AlertDescription>
                  </Alert>
                ) : null}
                {authMode === "real-m1" ? (
                  <>
                    <Field data-invalid={error?.invalidCredentials || undefined}>
                      <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        inputMode="email"
                        required
                        maxLength={320}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={error?.invalidCredentials || undefined}
                        aria-describedby={error ? "login-error" : undefined}
                        disabled={pending}
                      />
                    </Field>
                    <Field data-invalid={error?.invalidCredentials || undefined}>
                      <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        maxLength={1_024}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        aria-invalid={error?.invalidCredentials || undefined}
                        aria-describedby={error ? "login-error" : undefined}
                        disabled={pending}
                      />
                    </Field>
                  </>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="operational-scenario">Perfil</FieldLabel>
                    <Select
                      value={scenarioId}
                      items={Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario.label]))}
                      onValueChange={(value) => setScenarioId(value as ScenarioId)}
                    >
                      <SelectTrigger id="operational-scenario" aria-label="Perfil" aria-describedby="operational-scenario-note">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {scenarios.map((scenario) => (
                            <SelectItem key={scenario.id} value={scenario.id}>{scenario.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription id="operational-scenario-note">
                      Entorno de demostración: cualquier persona puede elegir un perfil. Este perfil corresponde a
                      {" "}{DEMO_IDENTITIES[scenarioId].name} {authMode === "backend-development" ? ` (id ${DEMO_IDENTITIES[scenarioId].sub} del seed del backend)` : null}.
                    </FieldDescription>
                  </Field>
                )}
                {error ? (
                  <Alert id="login-error" variant="danger">
                    {error.denied ? <AlertTitle>Sin acceso</AlertTitle> : null}
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ) : null}
                {pending && authMode === "real-m1" ? (
                  <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                    El servicio de ingreso está iniciando, puede tardar hasta un minuto y medio.
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? <><Spinner aria-hidden="true" /><span>Ingresando…</span></> : "Ingresar al sistema"}
                </Button>
              </FieldGroup>
            </form>
        </CardContent>
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Hiciste una denuncia?{" "}
          <Link href="/consulta" className="inline-flex min-h-10 items-center font-medium text-[var(--color-action)] underline underline-offset-4 max-[760px]:min-h-12">
            Consultar una denuncia
          </Link>
        </p>
      </Card>
    </main>
  );
}
