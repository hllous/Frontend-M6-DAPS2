import type { HTMLAttributes } from "react";

import { cn } from "cn";

type LoadingRegionProps = Omit<HTMLAttributes<HTMLDivElement>, "aria-busy" | "aria-label" | "role"> & {
  label: string;
  isLoading?: boolean;
};

function LoadingRegion({ label, isLoading = true, className, children, ...props }: LoadingRegionProps) {
  return (
    <div
      {...props}
      data-slot="loading-region"
      role="region"
      aria-label={label}
      aria-busy={isLoading}
      className={cn("min-w-0", className)}
    >
      {isLoading ? <span role="status" className="sr-only">Cargando</span> : null}
      {children}
    </div>
  );
}

export { LoadingRegion };
