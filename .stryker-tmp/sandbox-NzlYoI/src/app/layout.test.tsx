// @ts-nocheck
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next/server", () => ({ connection }));

import RootLayout from "./layout";

describe("RootLayout", () => {
  beforeEach(() => connection.mockClear());

  it("waits for the request so every page renders with its CSP nonce", async () => {
    const tree = await RootLayout({ children: <p>contenido</p> });

    expect(connection).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(tree)).toContain("<p>contenido</p>");
    expect(tree.props.lang).toBe("es");
  });
});
