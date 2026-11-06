import { connection } from "next/server";
import { redirect } from "next/navigation";

import { IntegrationMonitor } from "@/components/admin/integration-monitor";
import { getScenario } from "@/lib/scenarios";
import { auditQuerySchema } from "@/lib/integration-monitor";
import { getSession } from "@/lib/session";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function IntegrationMonitorPage({ searchParams }: { searchParams: PageSearchParams }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const scenario = getScenario(session);
  if (!scenario.capabilities.includes("integrationMonitor:view")) {
    return (
      <section aria-labelledby="integration-monitor-no-access" className="flex flex-col gap-3">
        <h1 id="integration-monitor-no-access" className="text-2xl font-bold tracking-tight">Sin acceso</h1>
        <p>Su perfil no tiene acceso a esta pantalla.</p>
      </section>
    );
  }

  const params = await searchParams;
  const rawEntityType = Array.isArray(params.entityType) ? params.entityType[0] : params.entityType;
  const rawEntityId = Array.isArray(params.entityId) ? params.entityId[0] : params.entityId;
  const parsedFilters = auditQuerySchema.safeParse({ entityType: rawEntityType, entityId: rawEntityId });
  const initialTab = params.tab === "activity" || params.tab === "received" ? params.tab : "events";
  const monitorKey = [
    initialTab,
    parsedFilters.success ? parsedFilters.data.entityType ?? "" : "",
    parsedFilters.success ? parsedFilters.data.entityId ?? "" : "",
  ].join(":");

  return (
    <IntegrationMonitor
      key={monitorKey}
      canManage={scenario.capabilities.includes("integrationMonitor:manage")}
      initialTab={initialTab}
      initialEntityType={parsedFilters.success ? parsedFilters.data.entityType : undefined}
      initialEntityId={parsedFilters.success ? parsedFilters.data.entityId : undefined}
    />
  );
}
