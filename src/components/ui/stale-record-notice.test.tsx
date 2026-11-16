import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { STALE_RECORD_EVENT, STALE_RECORD_MESSAGE } from "@/lib/record-versions";

import { StaleRecordNotice } from "./stale-record-notice";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StaleRecordNotice", () => {
  it("shows one persistent notice per 412 with a reload action, and reloads only when asked", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    render(<><Toaster /><StaleRecordNotice /></>);

    act(() => {
      window.dispatchEvent(new CustomEvent(STALE_RECORD_EVENT, { detail: { resource: "containers", id: "cont-1" } }));
      window.dispatchEvent(new CustomEvent(STALE_RECORD_EVENT, { detail: { resource: "containers", id: "cont-1" } }));
    });

    expect(await screen.findAllByText(STALE_RECORD_MESSAGE)).toHaveLength(1);
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
