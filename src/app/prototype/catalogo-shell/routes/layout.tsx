import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
  CatalogoPrototypeApp,
  CatalogoPrototypeSwitcher,
} from "@/components/prototype/catalogo-shell/catalogo-shell";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function CatalogoShellRoutesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <CatalogoPrototypeApp
        scenario={getScenario(session.scenarioId)}
        catalogContent={children}
      />
      <CatalogoPrototypeSwitcher variant="B" />
    </>
  );
}
