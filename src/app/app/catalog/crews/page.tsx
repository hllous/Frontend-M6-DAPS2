import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getSession } from "@/lib/session";

export default async function CrewsPlaceholderPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Cuadrillas</EmptyTitle>
        <EmptyDescription>La administración de cuadrillas estará disponible en la próxima entrega.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
