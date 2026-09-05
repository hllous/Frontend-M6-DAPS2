"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { AuthMode } from "@/lib/session";
import type { OperationalScenario, ScenarioId } from "@/lib/scenarios";

import styles from "./login-form.module.css";

export function LoginForm({
  scenarios,
  authMode,
}: {
  scenarios: OperationalScenario[];
  authMode: AuthMode;
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        setError(body.message ?? "No se pudo iniciar la sesión.");
        return;
      }
      window.location.assign("/app");
    } catch {
      setError("No se pudo conectar con la sesión local. Vuelva a intentarlo.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.mark} aria-hidden="true">M6</div>
        <p className={styles.kicker}>Ambiente y servicios</p>
        <h1 id="login-title">Ingresar al sistema operativo</h1>
        <p className={styles.intro}>
          Seleccione un escenario de trabajo para abrir una sesión protegida.
        </p>
        {isUnavailable ? (
          <p className={styles.unavailable} role="alert">
            La autenticación real de M1 no está disponible hasta publicar su contrato.
          </p>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup className={styles.form}>
              <Field className={styles.field}>
                <FieldLabel htmlFor="operational-scenario">Escenario operativo</FieldLabel>
              <select
                id="operational-scenario"
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value as ScenarioId)}
                aria-describedby="scenario-help"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
                ))}
              </select>
                <FieldDescription id="scenario-help">El alcance de la sesión se limita al escenario elegido.</FieldDescription>
              </Field>
              {error ? <FieldError className={styles.error}>{error}</FieldError> : null}
              <Button type="submit">Ingresar al sistema</Button>
            </FieldGroup>
          </form>
        )}
      </section>
    </main>
  );
}
