import { cn } from "cn";

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

export { DetailFieldsSkeleton };
