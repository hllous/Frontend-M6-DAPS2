import { handleStreetClosureTransition } from "../_transition";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  return handleStreetClosureTransition(request, id, "approve");
}
