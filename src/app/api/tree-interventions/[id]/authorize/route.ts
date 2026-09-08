import { handleTreeInterventionTransition } from "../_transition";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  return handleTreeInterventionTransition(request, context, "authorize");
}
