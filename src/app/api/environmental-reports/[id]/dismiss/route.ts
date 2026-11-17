import { transitionReport } from "../_transition";
import { versionedEnvironmentalReport } from "@/lib/bff-mock-versions";

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return transitionReport(request, id, "dismiss");
}

export const POST = versionedEnvironmentalReport(handlePOST);
