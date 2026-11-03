"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { argentinaDay, formatArgentinaCalendarDate } from "@/lib/argentina-date";
import { ENVIRONMENTAL_REPORT_TYPE_LABELS } from "@/lib/environmental-reports";
import {
  PUBLIC_REPORT_MESSAGES,
  checkTicketInput,
  fetchPublicReport,
  type PublicReport,
  type PublicReportLookupFailure,
  type PublicReportStage,
} from "@/lib/public-reports";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; report: PublicReport }
  | { status: "failed"; failure: PublicReportLookupFailure; ticketId?: string };

const PROGRESS_STEPS: { stage: PublicReportStage; label: string }[] = [
  { stage: "RECIBIDA", label: "Recibida" },
  { stage: "EN_ANALISIS", label: "En análisis" },
  { stage: "INSPECCION_PROGRAMADA", label: "Inspección programada" },
  { stage: "INSPECCIONADA", label: "Inspeccionada" },
  { stage: "EN_TRAMITE_SANCIONATORIO", label: "En trámite" },
  { stage: "CERRADA", label: "Cerrada" },
];
// Derivada es un final propio: el caso salió de este circuito, no pasó por inspección ni trámite.
const DERIVED_STEPS: { stage: PublicReportStage; label: string }[] = [
  { stage: "RECIBIDA", label: "Recibida" },
  { stage: "EN_ANALISIS", label: "En análisis" },
  { stage: "DERIVADA", label: "Derivada" },
];

// Un día de calendario (`inspectedAt`) no lleva hora: pasarlo por la zona horaria lo correría de día.
function dateLabel(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatArgentinaCalendarDate(value);
  return formatArgentinaCalendarDate(argentinaDay(value) ?? value);
}

export function ReportTracker({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [state, setState] = useState<LookupState>(() => {
    if (!initialCode) return { status: "idle" };
    const checked = checkTicketInput(initialCode);
    return "failure" in checked ? { status: "failed", failure: checked.failure } : { status: "loading" };
  });
  const resultRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  // El estado "cargando" lo fija quien llama; acá solo se pide la denuncia y se publica el resultado.
  const search = useCallback((ticketId: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return fetchPublicReport(ticketId, controller.signal).then(
      (outcome): LookupState => outcome.ok
        ? { status: "found", report: outcome.report }
        : { status: "failed", failure: outcome.failure, ticketId },
      // Una consulta nueva reemplazó a esta: no hay nada que mostrar.
      () => undefined,
    );
  }, []);

  const lookUp = useCallback((raw: string) => {
    const checked = checkTicketInput(raw);
    if ("failure" in checked) {
      controllerRef.current?.abort();
      setState({ status: "failed", failure: checked.failure });
      return;
    }
    setState({ status: "loading" });
    void search(checked.ticketId).then((next) => next && setState(next));
  }, [search]);

  useEffect(() => {
    const checked = initialCode ? checkTicketInput(initialCode) : undefined;
    if (checked && "ticketId" in checked) void search(checked.ticketId).then((next) => next && setState(next));
    return () => controllerRef.current?.abort();
  }, [initialCode, search]);

  useEffect(() => {
    if (state.status === "found") resultRef.current?.focus();
  }, [state]);

  const failure = state.status === "failed" ? state.failure : undefined;
  const retryable = failure === "unavailable";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              lookUp(code);
            }}
          >
            <FieldGroup>
              <Field data-invalid={failure === "malformed" || failure === "readableReference" || undefined}>
                <FieldLabel htmlFor="tracking-code">Código de seguimiento</FieldLabel>
                <Input
                  id="tracking-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="550e8400-e29b-41d4-a716-446655440000"
                  aria-invalid={failure === "malformed" || failure === "readableReference" || undefined}
                  aria-describedby="tracking-code-help"
                />
                <FieldDescription id="tracking-code-help">
                  Está en el comprobante que recibiste al hacer la denuncia. Podés pegarlo tal cual.
                </FieldDescription>
                {failure === "malformed" || failure === "readableReference" ? (
                  <FieldError>{PUBLIC_REPORT_MESSAGES[failure]}</FieldError>
                ) : null}
              </Field>
              <Button type="submit" className="w-full sm:w-fit" disabled={state.status === "loading"}>
                <SearchIcon data-icon="inline-start" />
                Consultar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {state.status === "loading" ? <ResultSkeleton /> : null}

      {failure && failure !== "malformed" && failure !== "readableReference" ? (
        <Alert variant="danger">
          <AlertDescription className="flex flex-col items-start gap-3">
            {PUBLIC_REPORT_MESSAGES[failure]}
            {retryable ? (
              <Button type="button" variant="outline" onClick={() => lookUp(state.status === "failed" && state.ticketId ? state.ticketId : code)}>
                Reintentar
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {state.status === "found" ? <ReportResult report={state.report} resultRef={resultRef} /> : null}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <LoadingRegion label="Buscando tu denuncia">
      <Card aria-hidden="true">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

function ReportResult({ report, resultRef }: { report: PublicReport; resultRef: React.RefObject<HTMLElement | null> }) {
  const heading = report.publicId ? `Denuncia ${report.publicId}` : "Tu denuncia";
  const details: [string, string][] = [
    ["Tipo", ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]],
    ...(report.address ? [["Dirección", report.address] as [string, string]] : []),
    ["Se abrió el", dateLabel(report.openedAt)],
    ["Última novedad", dateLabel(report.lastUpdateAt)],
    ...(report.inspectedAt ? [["Inspección", dateLabel(report.inspectedAt)] as [string, string]] : []),
  ];

  return (
    <>
      <p role="status" className="sr-only">{report.stageLabel}</p>
      <section ref={resultRef} tabIndex={-1} aria-labelledby="report-result-title" className="rounded-xl outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle id="report-result-title" role="heading" aria-level={2}>{heading}</CardTitle>
              {report.closed ? <Badge variant="neutral">Trámite cerrado</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-xl font-semibold leading-snug text-[var(--color-institutional)]">{report.stageLabel}</p>
            <StageSteps stage={report.stage} />
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details.map(([term, value]) => (
                <div key={term} className="flex flex-col">
                  <dt className="text-sm text-muted-foreground">{term}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StageSteps({ stage }: { stage: PublicReportStage }) {
  const steps = stage === "DERIVADA" ? DERIVED_STEPS : PROGRESS_STEPS;
  const currentIndex = steps.findIndex((step) => step.stage === stage);

  return (
    <ol aria-label="Etapas del trámite" className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr sm:gap-3">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step.stage}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-col sm:items-start sm:gap-1",
              current && "border-[var(--color-action)] bg-[var(--color-info-fill)] font-semibold text-[var(--color-info)]",
              done && "border-[var(--color-success-line)] bg-[var(--color-success-fill)] text-[var(--color-success)]",
              !current && !done && "border-border text-muted-foreground",
            )}
          >
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs">
              {done ? <CheckIcon className="size-3" /> : index + 1}
            </span>
            <span>
              {step.label}
              {done ? <span className="sr-only"> (completada)</span> : null}
              {current ? <span className="sr-only"> (etapa actual)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
