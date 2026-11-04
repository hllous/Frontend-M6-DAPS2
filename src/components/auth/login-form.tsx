"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail, MapPin, MessageSquare, Search, Users } from "lucide-react";
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

const HIGHLIGHTS = [
  { icon: MapPin, label: "Servicios urbanos y rutas en el mapa" },
  { icon: Users, label: "Cuadrillas y turnos de trabajo" },
  { icon: MessageSquare, label: "Seguimiento de denuncias ciudadanas" },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; denied: boolean; invalidCredentials?: boolean }>();
  const [pending, setPending] = useState(false);
  const realM1 = authMode === "real-m1";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    setPending(true);
    let loginSucceeded = false;

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: SESSION_MUTATION_HEADERS,
        body: JSON.stringify(realM1 ? { email, password } : { scenarioId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError({
          message: body.message ?? "No se pudo ingresar. Intente nuevamente.",
          denied: response.status === 403,
          invalidCredentials: realM1 && response.status === 401,
        });
        setPassword("");
        return;
      }
      window.location.assign(redirectTo);
      loginSucceeded = true;
    } catch {
      setError({ message: "No se pudo ingresar. Revise la conexión e intente nuevamente.", denied: false });
      setPassword("");
    } finally {
      if (!loginSucceeded) setPending(false);
    }
  }

  const iconClass = "pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[var(--color-text-secondary)]";

  return (
    <main className="grid min-h-dvh bg-[var(--color-canvas)] min-[761px]:grid-cols-[5fr_6fr]">
      <section className="relative flex flex-col overflow-hidden bg-[var(--color-institutional)] p-6 text-[var(--color-on-institutional)] min-[761px]:p-14">
        <svg aria-hidden="true" className="absolute inset-0 size-full text-[var(--color-on-institutional)] opacity-[0.14]" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M-20 700 C120 640 200 760 340 700 S560 620 640 680" />
          <path d="M-20 640 C120 580 200 700 340 640 S560 560 640 620" />
          <path d="M-20 580 C120 520 200 640 340 580 S560 500 640 560" />
          <path d="M-20 760 C120 700 200 820 340 760 S560 680 640 740" />
          <path d="M-20 820 C120 760 200 880 340 820 S560 740 640 800" />
          <circle cx="470" cy="190" r="120" />
          <circle cx="470" cy="190" r="80" />
          <circle cx="470" cy="190" r="40" />
          <path d="M350 190h240M470 70v240" />
        </svg>
        <div className="relative flex items-center gap-3.5">
          <span aria-hidden="true" className="grid size-[52px] shrink-0 place-items-center rounded-[14px] bg-[var(--color-surface)]">
            {/* Marcador de posición: reemplazar por el logo oficial del grupo si existe. */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 26V14l10-8 10 8v12" stroke="var(--color-institutional)" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M16 25c-4 0-6-3-6-6 4 0 6 2 6 6Zm0 0c4 0 6-3 6-6-4 0-6 2-6 6Z" fill="var(--color-success)" />
            </svg>
          </span>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-on-institutional-secondary)]">
            Municipalidad UADE
            <span className="block text-xs font-normal normal-case tracking-normal">Plataforma municipal integrada</span>
          </p>
        </div>
        <div className="relative my-auto pt-7 min-[761px]:pt-16">
          <p className="mb-5 inline-block rounded-full border border-[var(--color-on-institutional-secondary)]/50 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-on-institutional-secondary)] max-[760px]:hidden">
            Módulo 6
          </p>
          <p className="max-w-[15ch] text-[26px] font-bold leading-8 min-[761px]:text-[38px] min-[761px]:leading-[44px]">
            Ambiente, Higiene y Servicios Urbanos
          </p>
          <div className="max-[760px]:hidden">
            <p className="mt-4 max-w-[38ch] text-base leading-6 text-[var(--color-on-institutional-secondary)]">
              Secretaría de Ambiente, Higiene y Servicios Urbanos. Gestión de servicios, cuadrillas y denuncias.
            </p>
            <ul className="mt-9 grid gap-3.5">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[var(--color-on-institutional)]/12">
                    <Icon className="size-[18px]" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="relative text-xs text-[var(--color-on-institutional-secondary)] max-[760px]:hidden">
          Desarrollo de Aplicaciones II · UADE · Grupo 4
        </p>
      </section>

      <section className="grid place-items-center p-4 min-[761px]:p-6">
        <div className="flex w-full max-w-[440px] flex-col gap-4">
          <Card className="gap-0 p-6 min-[761px]:p-9">
            <CardHeader className="gap-0 px-0">
              <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-action)]">
                <Lock aria-hidden="true" className="size-4" />
                Acceso para empleados municipales y empresas contratistas
              </p>
              <h1 id="login-title" className="mt-2.5 text-[26px] leading-8 min-[761px]:text-[28px] min-[761px]:leading-[34px]">
                Ingresar
              </h1>
              {realM1 ? (
                <p className="mt-2 text-base leading-6 text-[var(--color-text-secondary)]">Ingrese con sus credenciales del Módulo 1.</p>
              ) : null}
            </CardHeader>
            <CardContent className="mt-5 px-0">
              <form onSubmit={submit} aria-busy={pending}>
                <FieldGroup>
                  {sessionExpired ? (
                    <Alert role="alert">
                      <AlertTitle>Sesión terminada</AlertTitle>
                      <AlertDescription>Su sesión terminó. Vuelva a ingresar.</AlertDescription>
                    </Alert>
                  ) : null}
                  {realM1 ? (
                    <>
                      <Field data-invalid={error?.invalidCredentials || undefined}>
                        <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                        <div className="relative">
                          <Mail aria-hidden="true" className={iconClass} />
                          <Input
                            id="login-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            inputMode="email"
                            required
                            maxLength={320}
                            className="pl-10"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            aria-invalid={error?.invalidCredentials || undefined}
                            aria-describedby={error ? "login-error" : undefined}
                            disabled={pending}
                          />
                        </div>
                      </Field>
                      <Field data-invalid={error?.invalidCredentials || undefined}>
                        <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                        <div className="relative">
                          <Lock aria-hidden="true" className={iconClass} />
                          <Input
                            id="login-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            maxLength={1_024}
                            className="pl-10 pr-12"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            aria-invalid={error?.invalidCredentials || undefined}
                            aria-describedby={error ? "login-error" : undefined}
                            disabled={pending}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-[var(--color-text-secondary)] max-[760px]:size-10"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            aria-pressed={showPassword}
                            disabled={pending}
                            onClick={() => setShowPassword((visible) => !visible)}
                          >
                            {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                          </Button>
                        </div>
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
                        {" "}{DEMO_IDENTITIES[scenarioId].name}.
                      </FieldDescription>
                    </Field>
                  )}
                  {error ? (
                    <Alert id="login-error" variant="danger">
                      {error.denied ? <AlertTitle>Sin acceso</AlertTitle> : null}
                      <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                  ) : null}
                  {pending && realM1 ? (
                    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                      El servicio de ingreso está iniciando, puede tardar hasta un minuto y medio.
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? <><Spinner aria-hidden="true" /><span>Ingresando…</span></> : <>Ingresar al sistema <ArrowRight aria-hidden="true" /></>}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <Card className="flex-row items-center gap-3.5 px-5 py-4">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-institutional)]">
              <Search className="size-5" />
            </span>
            <p className="flex-1 text-sm leading-5">
              <span className="block font-semibold">¿Hizo una denuncia?</span>
              <span className="block text-[var(--color-text-secondary)]">Consulte su estado sin iniciar sesión.</span>
            </p>
            <Link href="/consulta" className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-action)] underline underline-offset-4 max-[760px]:min-h-12">
              Consultar una denuncia
            </Link>
          </Card>

          {realM1 ? (
            <p className="text-center text-xs text-[var(--color-text-secondary)]">
              ¿Problemas para ingresar? Comuníquese con el administrador del Módulo 1.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
