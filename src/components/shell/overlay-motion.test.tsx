import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { detectSoftwareRenderer, OverlayMotionPreference } from "./overlay-motion";

function mockRenderer(renderer: string) {
  const loseContext = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: (name: string) => name === "WEBGL_debug_renderer_info"
      ? { UNMASKED_RENDERER_WEBGL: 37446 }
      : { loseContext },
    getParameter: () => renderer,
  } as unknown as WebGLRenderingContext);
  return loseContext;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-overlay-motion");
});

describe("overlay motion preference", () => {
  it.each([
    "ANGLE (Google, Vulkan SwiftShader Device)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11)",
  ])("detects software renderer %s and releases the temporary context", (renderer) => {
    const loseContext = mockRenderer(renderer);
    expect(detectSoftwareRenderer()).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it.each(["ANGLE (Intel, Intel UHD Graphics)", "", "Mesa AMD Radeon RX 6600"])(
    "keeps motion enabled for hardware or unknown renderer %s", (renderer) => {
      mockRenderer(renderer);
      expect(detectSoftwareRenderer()).toBe(false);
    },
  );

  it("keeps motion enabled when WebGL is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectSoftwareRenderer()).toBe(false);
  });

  it("treats a masked renderer as unknown and releases its context", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: (name: string) => name === "WEBGL_lose_context" ? { loseContext } : null,
    } as unknown as WebGLRenderingContext);
    expect(detectSoftwareRenderer()).toBe(false);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("keeps the shell usable when a graphics driver rejects extension queries", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => { throw new Error("WebGL unavailable"); },
    } as unknown as WebGLRenderingContext);
    expect(detectSoftwareRenderer()).toBe(false);
  });

  it("disables surface motion after client mount with a software renderer", () => {
    mockRenderer("SwiftShader");
    render(<OverlayMotionPreference />);
    expect(document.documentElement).toHaveAttribute("data-overlay-motion", "off");
  });

  it("does not set the root preference for an unknown renderer", () => {
    mockRenderer("");
    render(<OverlayMotionPreference />);
    expect(document.documentElement).not.toHaveAttribute("data-overlay-motion");
  });
});
