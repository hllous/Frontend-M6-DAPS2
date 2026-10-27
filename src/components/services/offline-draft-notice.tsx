import type { ReactNode } from "react";
import { CloudOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export const OFFLINE_DRAFT_MESSAGE =
  "Sin conexión. Se guardó en este dispositivo; reenvíe cuando vuelva la conexión.";

/** Aviso único de borrador sin enviar por falta de conexión; el botón "Reenviar" vive junto a la acción. */
export function OfflineDraftNotice({ children = OFFLINE_DRAFT_MESSAGE, className }: { children?: ReactNode; className?: string }) {
  return (
    <Alert variant="warning" role="status" className={className}>
      <CloudOff aria-hidden />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
