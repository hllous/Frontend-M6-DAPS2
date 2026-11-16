import { handleTreeInterventionTransition } from "../_transition";
import { versionedTreeIntervention } from "@/lib/bff-mock-versions";

async function handlePOST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleTreeInterventionTransition(request, context, "authorize");
}

export const POST = versionedTreeIntervention(handlePOST);
