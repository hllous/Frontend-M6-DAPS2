import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/** Visible notice for operational lists that dropped records with an unknown backend enum value (#651). Renders nothing for 0. */
export function DroppedRecordsAlert({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <Alert variant="warning" role="status" className={className}>
      <TriangleAlert aria-hidden />
      <AlertDescription>
        {count === 1 ? "1 registro no se pudo mostrar" : `${count} registros no se pudieron mostrar`} con esta versión de la aplicación.
      </AlertDescription>
    </Alert>
  );
}
