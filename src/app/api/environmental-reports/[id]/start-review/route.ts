import { transitionReport } from "../_transition";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return transitionReport(request, id, "start-review");
}
