import { cn } from "cn";

import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DetailFieldsSkeletonProps = { fieldCount?: number; className?: string };

// Mirrors the `<dl>` of the Catalogo A detail panes: small uppercase label over a value, two columns from `sm`.
function DetailFieldsSkeleton({ fieldCount = 6, className }: DetailFieldsSkeletonProps) {
  return <div data-slot="detail-fields-skeleton" aria-hidden="true" className={cn("grid gap-4 text-sm sm:grid-cols-2", className)}>
    {Array.from({ length: fieldCount }, (_, field) => <div key={field} className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={cn("h-5", field % 2 === 0 ? "w-3/4" : "w-1/2")} />
    </div>)}
  </div>;
}


type FieldRowsProps = { fieldCount: number; className?: string };

// `<dl>` of the mobile cards: uppercase label over a value, one per field.
function CardFieldsSkeleton({ fieldCount, className }: FieldRowsProps) {
  return <div data-slot="card-fields-skeleton" className={cn("grid gap-3 text-sm", className)}>
    {Array.from({ length: fieldCount }, (_, field) => <div key={field}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className={cn("mt-0.5 h-5", field % 2 === 0 ? "w-3/4" : "w-1/2")} />
    </div>)}
  </div>;
}

function CardActionsSkeleton({ actionCount, className }: { actionCount: number; className?: string }) {
  return <div data-slot="card-actions-skeleton" className={cn("flex flex-wrap gap-2", className)}>
    {Array.from({ length: actionCount }, (_, action) => <Skeleton key={action} className={cn("h-7 max-[760px]:h-12", action === 0 ? "w-28" : "w-20")} />)}
  </div>;
}

type RecordCardSkeletonProps = { fieldCount?: number; actionCount?: number };

// Trees: bordered article with code + species, status, three fields and the row of actions.
function RecordCardSkeleton({ fieldCount = 3, actionCount = 3 }: RecordCardSkeletonProps) {
  return <article data-slot="record-card-skeleton" aria-hidden="true" className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div><Skeleton className="h-4 w-24" /><Skeleton className="mt-1 h-6 w-36" /></div>
      <Skeleton className="h-5 w-16" />
    </div>
    <CardFieldsSkeleton fieldCount={fieldCount} className="mt-4" />
    {actionCount > 0 ? <CardActionsSkeleton actionCount={actionCount} className="mt-4" /> : null}
  </article>;
}

// Tree surveys: date + health/risk badges with the detail button on the right, three fields.
function SurveyCardSkeleton() {
  return <article data-slot="survey-card-skeleton" aria-hidden="true" className="rounded-xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Skeleton className="h-5 w-32" /><div className="mt-2 flex flex-wrap gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></div>
      <Skeleton className="h-7 w-28 max-[760px]:h-12" />
    </div>
    <CardFieldsSkeleton fieldCount={3} className="mt-4 sm:grid-cols-3" />
  </article>;
}

// Green points: standard Card with code button, name, status badge and three fields.
function GreenPointCardSkeleton() {
  return <Card data-slot="green-point-card-skeleton" aria-hidden="true">
    <CardHeader>
      <Skeleton className="h-7 w-24 max-[760px]:h-12" />
      <Skeleton className="h-5 w-40" />
      <CardAction><Skeleton className="h-5 w-16 rounded-full" /></CardAction>
    </CardHeader>
    <CardContent><CardFieldsSkeleton fieldCount={3} className="mt-4" /></CardContent>
  </Card>;
}

// Tree interventions: compact Card with reference + type, status, two-column fields and the detail button.
function InterventionCardSkeleton() {
  return <Card data-slot="intervention-card-skeleton" aria-hidden="true" size="sm" className="gap-2 py-2">
    <CardHeader className="flex flex-col items-start gap-1 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-x-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-40" /></div>
      <Skeleton className="h-5 w-28" />
    </CardHeader>
    <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="grid min-w-[17rem] flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(6rem,0.7fr)_minmax(7rem,0.8fr)_minmax(11rem,1.5fr)]">
        <div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:items-start sm:gap-0"><Skeleton className="h-4 w-12" /><Skeleton className="h-5 w-20" /></div>
        <div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:items-start sm:gap-0"><Skeleton className="h-4 w-14" /><Skeleton className="h-5 w-16 rounded-full" /></div>
        <div className="col-span-2 flex min-w-0 items-baseline gap-1.5 sm:col-span-1 sm:flex-col sm:items-start sm:gap-0"><Skeleton className="h-4 w-14" /><Skeleton className="h-5 w-3/4" /></div>
      </div>
      <Skeleton className="ml-auto h-10 w-28 max-[760px]:h-12" />
    </CardContent>
  </Card>;
}

export { DetailFieldsSkeleton, GreenPointCardSkeleton, InterventionCardSkeleton, RecordCardSkeleton, SurveyCardSkeleton };
