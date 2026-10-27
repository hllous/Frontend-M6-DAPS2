"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuthMode } from "@/lib/session";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import type { OperationalScenario, ScenarioId } from "@/lib/scenarios";

export function LoginForm({
  scenarios,
  authMode,
  redirectTo,
}: {
  scenarios: OperationalScenario[];
  authMode: AuthMode;
  redirectTo: string;
}) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(scenarios[0]?.id ?? "office-duty-queue");
  const [error, setError] = useState<string>();
  const isUnavailable = authMode === "real-m1";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: SESSION_MUTATION_HEADERS,
        body: JSON.stringify({ scenarioId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? "No se pudo ingresar. Intente nuevamente.");
        return;
      }
      window.location.assign(redirectTo);
    } catch {
      setError("No se pudo ingresar. Revise la conexión e intente nuevamente.");
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
          {isUnavailable ? (
            <Alert variant="danger">
              <AlertDescription>
                El ingreso no está disponible por el momento.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={submit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="operational-scenario">Perfil</FieldLabel>
                  <Select
                    value={scenarioId}
                    items={Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario.label]))}
                    onValueChange={(value) => setScenarioId(value as ScenarioId)}
                  >
                    <SelectTrigger id="operational-scenario" aria-label="Perfil">
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
                </Field>
                {error ? (
                  <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full">Ingresar al sistema</Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
