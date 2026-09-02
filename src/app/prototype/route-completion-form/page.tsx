import { Suspense } from "react";
import { RouteCompletionPrototype } from "./Client";

export default function RouteCompletionPrototypePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
      <RouteCompletionPrototype />
    </Suspense>
  );
}
