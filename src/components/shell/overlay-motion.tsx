"use client";

import { useEffect } from "react";

/** WebGL is a best-effort signal: unavailable or masked renderers are unknown. */
export function detectSoftwareRenderer(): boolean {
  let context: WebGLRenderingContext | null = null;
  try {
    context = document.createElement("canvas").getContext("webgl");
    const info = context?.getExtension("WEBGL_debug_renderer_info");
    if (!context || !info) return false;
    const renderer: unknown = context.getParameter(info.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" && /SwiftShader|llvmpipe|Basic Render/i.test(renderer);
  } catch {
    return false;
  } finally {
    try {
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // A lost or unavailable context must not prevent the shell from mounting.
    }
  }
}

export function OverlayMotionPreference() {
  useEffect(() => {
    if (detectSoftwareRenderer()) document.documentElement.dataset.overlayMotion = "off";
  }, []);
  return null;
}
