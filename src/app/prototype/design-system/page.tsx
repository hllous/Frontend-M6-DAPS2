import { Suspense } from "react"

import { DesignSystemPrototype } from "./prototype-client"

export default function DesignSystemPrototypePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DesignSystemPrototype />
    </Suspense>
  )
}
